const assert=require('node:assert/strict');const {test}=require('node:test');require('ts-node').register({transpileOnly:true});
const axios=require('axios');const originalGet=axios.get;let calls=0;
axios.get=async url=>{calls++;if(url.includes('/cnpj/'))return {data:{razao_social:'EMPRESA TESTE',estabelecimento:{cnpj:'55094731000135',estado:{sigla:'GO'},cidade:{nome:'Goiânia',ibge_id:5208707},tipo_logradouro:'RUA',logradouro:'TESTE',numero:'10',bairro:'CENTRO',cep:'74003010'}}};if(url.includes('01001000'))return {data:{uf:'SP',localidade:'São Paulo',ibge:'3550308',logradouro:'Praça da Sé',bairro:'Sé'}};return {data:{erro:true}};};
const {lookupFiscalCnpj,lookupFiscalCep,validCnpj,activeStateRegistration}=require('../src/services/fiscal-recipient.service');
test('CNPJ válido preenche endereço e IBGE sem inferir tributação; cache evita consultas repetidas',async()=>{assert.equal(validCnpj('55094731000135'),true);const r=await lookupFiscalCnpj('55.094.731/0001-35');assert.equal(r.address.cityCode,'5208707');assert.equal(r.address.streetNumber,'10');assert.equal('taxpayerIndicator' in r.address,false);await lookupFiscalCnpj('55094731000135');assert.equal(calls,1);});
test('CPF, CNPJ incompleto e dígito verificador inválido não consultam o provedor',async()=>{const before=calls;for(const id of ['52998224725','550947310001','55094731000136'])await assert.rejects(lookupFiscalCnpj(id),/CNPJ válido/);assert.equal(calls,before);});
test('CEP preenche somente endereço, sem inventar número ou fundamento do DIFAL',async()=>{const r=await lookupFiscalCep('01001-000');assert.equal(r.address.cityCode,'3550308');assert.equal(r.address.streetNumber,'');assert.equal(r.address.stateCode,'SP');await assert.rejects(lookupFiscalCep('99999999'),/CEP não localizado/);});
const db=require.resolve('../src/config/database');require.cache[db]={id:db,filename:db,loaded:true,exports:{prisma:{}}};
const {sanitizeDraft}=require('../src/services/fiscal-ai.service');
const raw=()=>({recipientName:'Cliente',recipientTaxId:'55094731000135',paymentMethod:'PIX',items:[{description:'Camiseta',quantity:1,unitPrice:100}]});
test('IA sem endereço ou orientação fiscal deixa informações desconhecidas vazias',()=>{const {draft}=sanitizeDraft(raw());assert.equal(draft.recipientAddress.stateCode,'');assert.equal(draft.recipientAddress.taxpayerIndicator,'');assert.equal(draft.finalConsumer,null);assert.equal(draft.difal.applies,null);assert.equal(draft.freightMode,'');});
test('IA preserva endereço informado e escolhas explícitas, sanitizando IBGE incompatível',()=>{const data=raw();data.recipientAddress={stateCode:'go',cityCode:'5300108',cityName:'Goiânia',street:'Rua Entrega',streetNumber:'7',zipCode:'74003-010',taxpayerIndicator:'1',stateTaxId:'123.456'};data.finalConsumer='false';data.freightMode='1';data.difal={applies:'false',reason:'Informado pelo contador'};const {draft}=sanitizeDraft(data);assert.equal(draft.recipientAddress.streetNumber,'7');assert.equal(draft.recipientAddress.cityCode,'');assert.equal(draft.recipientAddress.zipCode,'74003010');assert.equal(draft.finalConsumer,false);assert.equal(draft.difal.applies,false);});
process.on('exit',()=>{axios.get=originalGet;});

 test('consulta preenche contribuinte somente com IE ativa e inequívoca da UF do cadastro',()=> {
 const active={ativo:true,estado:{sigla:'GO'},inscricao_estadual:'201.490.145'};
 assert.deepEqual(activeStateRegistration([active],'GO'),{taxpayerIndicator:'1',stateTaxId:'201490145'});
 assert.equal(activeStateRegistration([{...active,ativo:false}],'GO'),undefined);
 assert.equal(activeStateRegistration([active],'DF'),undefined);
 assert.equal(activeStateRegistration([active,{...active,inscricao_estadual:'123456789'}],'GO'),undefined);
 assert.equal(activeStateRegistration(undefined,'GO'),undefined);
 });
