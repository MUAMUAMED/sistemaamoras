const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');
require('ts-node').register({ transpileOnly: true });
const { validateNfeSeries, validateOperation, validateCfop, validateNfeTax } = require('../src/services/fiscal-operation');
const { XMLParser } = require('fast-xml-parser');
const vendorPath = require.resolve('../src/vendor/finopenpos-fiscal');
const actualVendor = require(vendorPath);
let config, documents, sales, sent, qrCalls, writes, status;
const fakePrisma = {
  fiscalConfig: { findUnique: async () => config },
  fiscalDocument: {
    findUnique: async ({where}) => documents.get(where.id),
    update: async ({where, data}) => { Object.assign(documents.get(where.id), data); writes++; return documents.get(where.id); },
  },
  $transaction: async callback => {
    if (Array.isArray(callback)) return Promise.all(callback);
    return callback({
      fiscalConfig: { update: async ({data}) => { for (const key of ['nextNfeNumber','nextNfceNumber']) if(data[key]) config[key]++; writes++; return config; } },
      sale: { create: async ({data}) => { const sale = { id: 'sale'+sales.length, ...data }; sales.push(sale); writes++; return sale; } },
      fiscalDocument: { create: async ({data}) => { const doc = { id: 'doc'+documents.size, issuedAt: new Date('2026-10-13T12:00:00Z'), status:'PENDING', ...data, items:data.items.create, sale:sales.find(s=>s.id===data.saleId) }; documents.set(doc.id,doc); writes++; return doc; } },
    });
  },
  fiscalEvent: { create: async ({data}) => data },
};
const databasePath = require.resolve('../src/config/database');
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded:true, exports:{prisma:fakePrisma} };
const cryptoPath = require.resolve('../src/services/fiscal-crypto.service');
require.cache[cryptoPath] = { id:cryptoPath, filename:cryptoPath, loaded:true, exports:{decryptFiscalSecret:()=>Buffer.from('fixture')} };
require.cache[vendorPath].exports = {
  ...actualVendor,
  loadCertificate:()=>({ privateKey:'fixture',certificate:'fixture' }),
  signXml:xml=>xml, signEventXml:xml=>xml,
  putQRTag:async ({xml})=> { qrCalls++; return xml; },
  sefazRequest:async request=> { sent.push(request); return { content:'fixture',body:'fixture' }; },
  parseAuthorizationResponse:()=>({statusCode:status,statusMessage:'fixture',protocolNumber:'123456789012345',authorizedAt:'2026-10-13T12:00:00Z'}),
  attachProtocol:xml=>`<nfeProc>${xml}</nfeProc>`,
  parseCancellationResponse:()=>({statusCode:135,statusMessage:'Cancelado'}),
};
const service = require('../src/services/fiscal.service');
const baseAddress = { stateCode:'GO',cityCode:'5208707',cityName:'Goiânia',street:'Rua de teste',streetNumber:'10',district:'Centro',zipCode:'74000000',taxpayerIndicator:'9' };
const input = () => ({ recipientName:'Cliente de teste',recipientTaxId:'52998224725',recipientAddress:{...baseAddress},finalConsumer:true,freightMode:'0',difal:{applies:false,reason:'Enquadramento Simples confirmado pelo contador'},paymentMethod:'PIX',notes:'Venda de teste',items:[{description:'Produto de teste',quantity:2,unitPrice:50,ncm:'61091000',cfop:'6108'}] });
const parsed = xml => new XMLParser().parse(xml).NFe.infNFe;
beforeEach(()=> {
 config={active:true,companyName:'EMPRESA TESTE',tradeName:'TESTE',taxId:'12345678000195',stateTaxId:'123456789',taxRegime:1,stateCode:'DF',cityCode:'5300108',cityName:'Brasília',street:'Rua do emitente',streetNumber:'1',district:'Centro',zipCode:'70000000',environment:'HOMOLOGATION',nfeSeries:2,nfceSeries:3,nextNfeNumber:101,nextNfceNumber:201,certificatePfxEncrypted:'fixture',certificatePasswordEncrypted:'fixture',cscId:'1',cscTokenEncrypted:'fixture',defaultNcm:'61091000',defaultCfop:'5102',defaultIcmsCst:'102',defaultPisCst:'07',defaultCofinsCst:'07'};
 documents=new Map();sales=[];sent=[];qrCalls=0;writes=0;status=100;
});
test('NF-e interestadual usa modelo 55, série e número próprios, destino 2 e endereço real, sem CSC', async()=> {
 config.cscId=null;config.cscTokenEncrypted=null;
 const doc=await service.issueManualNfe(input(),'admin');
 const xml=parsed(doc.requestXml);
 assert.equal(doc.model,55);assert.equal(doc.series,2);assert.equal(doc.number,101);
 assert.equal(config.nextNfceNumber,201);assert.equal(xml.ide.idDest,2);assert.equal(xml.ide.tpImp,1);
 assert.equal(xml.dest.enderDest.UF,'GO');assert.equal(xml.dest.enderDest.cMun,5208707);assert.equal(xml.dest.indIEDest,9);
 assert.equal(qrCalls,0);assert.equal(sent[0].url,actualVendor.getSefazUrl('DF','NfeAutorizacao',2,false,55));
 assert.equal(xml.total.ICMSTot.vNF,100);assert.match(doc.requestXml,/Venda de teste/);
});
test('NFC-e local mantém modelo 65, destino 1, QR e numeração própria', async()=> {
 const data=input();data.items[0].cfop='5102';delete data.recipientAddress;
 const doc=await service.issueManualNfce(data,'admin'); const xml=parsed(doc.requestXml);
 assert.equal(doc.model,65);assert.equal(doc.number,201);assert.equal(doc.series,3);assert.equal(config.nextNfeNumber,101);
 assert.equal(xml.ide.idDest,1);assert.equal(xml.ide.tpImp,4);assert.equal(qrCalls,1);
});
test('bloqueia CFOP local na NF-e e interestadual na NFC-e antes de gravar ou transmitir', async()=> {
 const data=input();data.items[0].cfop='5102';await assert.rejects(service.issueManualNfe(data,'admin'),/CFOP/);
 const local=input();delete local.recipientAddress;await assert.rejects(service.issueManualNfce(local,'admin'),/CFOP/);
 assert.equal(writes,0);assert.equal(sent.length,0);
});
test('bloqueia dados incompletos, IBGE de outra UF e contribuinte sem IE',async()=> {
 for (const change of [{street:''},{cityCode:'5300108'},{taxpayerIndicator:'1'}]) {
  const data=input();Object.assign(data.recipientAddress,change);await assert.rejects(service.issueManualNfe(data,'admin'));
 }
 const data=input();delete data.recipientTaxId;await assert.rejects(service.issueManualNfe(data,'admin'),/CPF/);
 assert.equal(writes,0);
});
test('contribuinte aceita 6102, preserva IE e finalidade da compra',async()=> {
 const data=input();data.recipientAddress.taxpayerIndicator='1';data.recipientAddress.stateTaxId='123456789';data.finalConsumer=false;data.items[0].cfop='6102';
 const doc=await service.issueManualNfe(data,'admin');const xml=parsed(doc.requestXml);
 assert.equal(xml.dest.indIEDest,1);assert.equal(xml.dest.IE,123456789);assert.equal(xml.ide.indFinal,0);
});
test('DIFAL e FCP têm bases, taxas e totais consistentes; PIS e COFINS preservam casas decimais',async()=> {
 config.taxRegime=3;config.defaultIcmsCst='00';config.defaultPisCst='01';config.defaultCofinsCst='01';
 const data=input();data.difal={applies:true};Object.assign(data.items[0],{icmsRate:12,pisRate:1.65,cofinsRate:7.6,difal:{base:100,internalRate:20,interstateRate:12,fcpRate:2}});
 const doc=await service.issueManualNfe(data,'admin');const xml=parsed(doc.requestXml);
 assert.equal(xml.det.imposto.ICMS.ICMS00.pICMS,12);assert.equal(xml.det.imposto.PIS.PISAliq.pPIS,1.65);assert.equal(xml.det.imposto.COFINS.COFINSAliq.pCOFINS,7.6);
 assert.equal(xml.det.imposto.ICMSUFDest.vICMSUFDest,8);assert.equal(xml.det.imposto.ICMSUFDest.vFCPUFDest,2);
 assert.equal(xml.total.ICMSTot.vICMSUFDest,8);assert.equal(xml.total.ICMSTot.vFCPUFDest,2);assert.equal(xml.total.ICMSTot.vPIS,1.65);
});
test('reenvio mantém destino, tributos e emitente original; mudança de ambiente é bloqueada',async()=> {
 status=999;const doc=await service.issueManualNfe(input(),'admin');assert.equal(doc.status,'REJECTED');
 config.defaultCfop='5101';config.cityName='Outra cidade';status=100;
 const retried=await service.transmitFiscalDocument(doc.id);const xml=parsed(retried.requestXml);
 assert.equal(xml.ide.idDest,2);assert.equal(xml.det.prod.CFOP,6108);assert.equal(xml.emit.enderEmit.xMun,'Brasília');
 config.environment='PRODUCTION';await assert.rejects(service.transmitFiscalDocument(doc.id),/Ambiente/);
});
test('cancelamento usa serviço da NF-e e não exige CSC',async()=> {
 config.cscId=null;config.cscTokenEncrypted=null;const doc=await service.issueManualNfe(input(),'admin');
 const result=await service.cancelFiscalDocument(doc.id,'Cancelamento de teste solicitado');assert.equal(result.success,true);
 assert.equal(sent.at(-1).url,actualVendor.getSefazUrl('DF','RecepcaoEvento',2,false,55));
});
test('bloqueia tributação sem suporte, DIFAL incompleto e omissão sem fundamento',()=> {
 assert.throws(()=>validateNfeTax({icmsCst:'201'},1,false),/não suportados/);
 assert.throws(()=>validateOperation({...input(),difal:{applies:false}},'DF',1),/fundamento/);
 assert.throws(()=>validateOperation({...input(),difal:{applies:true}},'DF',1),/incompatível/);
 assert.throws(()=>validateCfop('6108',65,2),/NFC-e/);
});

test('bloqueia séries especiais antes de consumir numeração fiscal',async()=> {
 validateNfeSeries(889);assert.throws(()=>validateNfeSeries(999),/série/);
 config.nfeSeries=999;await assert.rejects(service.issueManualNfe(input(),'admin'),/série/);
 assert.equal(writes,0);assert.equal(sent.length,0);
});
