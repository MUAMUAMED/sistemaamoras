# Emissão interestadual de produtos

No emissor avulso, selecione **Envio para outro estado — NF-e**. O sistema usa o mesmo cadastro do emitente, modelo 55, destino 2, série e sequência próprias. **Venda local / retirada no DF — NFC-e** mantém o modelo 65 e a sequência do PDV.

Antes de usar, configure série e próximo número da NF-e na Central Fiscal e confirme a tributação com o contador. Endereço de entrega, CPF/CNPJ, condição de contribuinte e finalidade da compra são obrigatórios na NF-e. O município precisa ter código IBGE de sete dígitos compatível com a UF.

## Operações suportadas

Este fluxo é destinado a venda de produção própria ou revenda, sem cálculo de substituição tributária, crédito do Simples, redução de base, IPI ou IBS/CBS. Essas situações exigem ampliação da integração fiscal antes do uso. NFS-e não foi implementada.

| Campo | Suporte |
| --- | --- |
| CFOP de venda para contribuinte | 6101 ou 6102, conforme a operação |
| CFOP de venda para não contribuinte | 6107 ou 6108, conforme a operação |
| Simples Nacional (CRT 1) | CSOSN 102, 103, 300 ou 400 |
| CRT 2 ou 3 | CST 00 com alíquota explícita, ou CST 41 |
| PIS/COFINS | CST 01, 02, 04 a 09, 49 ou 99; alíquotas explícitas quando aplicáveis |
| DIFAL/FCP no XML | Base e alíquotas por item informadas pelo operador; valores e totais calculados pelo sistema |
| Sem destaque de DIFAL | Fundamento obrigatório para consumidor final não contribuinte |
| Transporte | Modalidade informada, sem adicionar custo de frete à nota |

A interface não transforma automaticamente CFOP local em interestadual. CST/CSOSN que exigem campos ausentes são bloqueados. O grupo ICMSUFDest é bloqueado para CRT 1 e para operações incompatíveis. O sistema não emite guias de recolhimento.

Os dados de destino, tributos e emitente ficam preservados no snapshot do documento, para reenvio, cancelamento e apresentação. Não houve mudança de schema ou migração nesta implementação. A NF-e usa apresentação A4 com código de barras da chave; a NFC-e mantém o cupom.

## Verificação

- Backend: `npm run check:fiscal` e `npm run test:fiscal` na pasta `backend`.
- Frontend: `npm run check:fiscal` na pasta `frontend`.
- Os testes simulam banco, assinatura e SEFAZ: não transmitem documentos reais.
- Verificação visual no navegador: seleção do modelo, preenchimento, confirmação, payload interestadual e apresentação A4 com várias páginas.

As pendências de compilação do backend e do frontend foram corrigidas. A versão de publicação foi preparada a partir dos commits que estavam em execução na Zeabur, preservando as demais funcionalidades. Os dez testes fiscais e a validação do emissor no navegador passaram. A consulta do serviço de NF-e em homologação retornou cStat 107 (Serviço em Operação). A NF-e interestadual de teste foi autorizada pela SEFAZ em homologação com cStat 100 e protocolo 353260000099367. A configuração permaneceu em produção com série e próximo número inalterados. O emissor aceita séries comuns de 1 a 889 e bloqueia séries especiais. Backend e frontend são publicados pelos serviços existentes na Zeabur.

Referências: [MOC NF-e/NFC-e](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), [tabela CFOP](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/facilitacao/anexo-ecf-cfop), [notas técnicas vigentes](https://www.nfe.fazenda.gov.br/Portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D).
