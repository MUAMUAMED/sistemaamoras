# Emissão interestadual de produtos

No emissor avulso, selecione **Revenda / entrega no DF ou em outro estado — NF-e**. O sistema usa o mesmo cadastro do emitente, modelo 55, destino conforme a entrega, série e sequência próprias. **Venda ao consumidor final no DF — NFC-e** mantém o modelo 65 e a sequência do PDV.

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
| Sem destaque de DIFAL | Fundamento obrigatório para consumidor final não contribuinte em operação interestadual, regime normal |
| Transporte | Modalidade informada, sem adicionar custo de frete à nota |

Itens sem CFOP próprio usam o padrão da Central Fiscal, ajustado à família de venda configurada, destino efetivo e condição do destinatário. São mapeadas somente as famílias de venda simples 5101/6101/6107 e 5102/6102/6108. Códigos explícitos são preservados e validados; padrões especiais não são convertidos. CST/CSOSN que exigem campos ausentes são bloqueados. O grupo ICMSUFDest é bloqueado para CRT 1 e para operações incompatíveis. O sistema não emite guias de recolhimento.

Os dados de destino, tributos e emitente ficam preservados no snapshot do documento, para reenvio, cancelamento e apresentação. Não houve mudança de schema ou migração nesta implementação. A NF-e usa apresentação A4 com código de barras da chave; a NFC-e mantém o cupom.

## Verificação

- Backend: `npm run check:fiscal` e `npm run test:fiscal` na pasta `backend`.
- Frontend: `npm run check:fiscal` na pasta `frontend`.
- Os testes simulam banco, assinatura e SEFAZ: não transmitem documentos reais.
- Verificação visual no navegador: seleção do modelo, preenchimento, confirmação, payload interestadual e apresentação A4 com várias páginas.

As pendências de compilação do backend e do frontend foram corrigidas. A versão de publicação foi preparada a partir dos commits que estavam em execução na Zeabur, preservando as demais funcionalidades. Os dez testes fiscais e a validação do emissor no navegador passaram. A consulta do serviço de NF-e em homologação retornou cStat 107 (Serviço em Operação). A NF-e interestadual de teste foi autorizada pela SEFAZ em homologação com cStat 100 e protocolo 353260000099367. A configuração permaneceu em produção com série e próximo número inalterados. O emissor aceita séries comuns de 1 a 889 e bloqueia séries especiais. Backend e frontend são publicados pelos serviços existentes na Zeabur.

Referências: [MOC NF-e/NFC-e](https://www.confaz.fazenda.gov.br/legislacao/arquivo-manuais/moc7-anexo-i-leiaute-e-rv.pdf), [tabela CFOP](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/facilitacao/anexo-ecf-cfop), [notas técnicas vigentes](https://www.nfe.fazenda.gov.br/Portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D).

## Preenchimento do destinatário

O CNPJ completo consulta automaticamente o endereço cadastral pela API pública CNPJ.ws, com alternativa BrasilAPI. Os campos já digitados ou informados pela IA são preservados; o botão “Usar endereço do CNPJ” aplica o cadastro quando a entrega for naquele endereço. CPF não dispara consulta de CNPJ. Falhas de consulta permitem continuar com preenchimento manual.

O CEP completa UF, município, código IBGE, bairro e logradouro pelo ViaCEP. Número e complemento continuam dependentes da informação de entrega. Respostas antigas são descartadas quando o documento ou CEP mudam.

A IA agora extrai o endereço de entrega e as escolhas fiscais explicitamente descritas. Finalidade e transporte são extraídos quando explicitamente descritos ou escolhidos pelo operador. CNPJ sozinho não implica contribuinte: apenas IE ativa e inequívoca da UF do cadastro preenche essa condição. DIFAL no XML é resolvido para operações incompatíveis e CRT=1; casos aplicáveis no regime normal exigem confirmação. Endereço cadastral e local de entrega devem ser revisados separadamente.

Verificação adicional: `npm run test:fiscal:autofill` no backend, com cinco cenários de consulta, cache, validação, extração do endereço e ausência de inferências fiscais.


### Revenda com entrega na loja (13/10/2026)
- NF-e aceita operações internas e interestaduais; NFC-e fica no fluxo de consumidor final.
- Endereço cadastral do destinatário e local da entrega são separados no XML e no DANFE.
- A entrega explícita determina idDest e a família do CFOP. Entrega no DF para destinatário em GO usa grupo entrega/UF=DF, mantendo enderDest/UF=GO.
- Consulta CNPJ preenche indIEDest=1 e IE somente quando há uma inscrição ativa e inequívoca na UF do cadastro. Ausência de IE não determina não contribuinte.
- Atalho “Revenda com entrega na loja e frete gratuito” aplica indFinal=0, modFrete=3 e endereço do emitente; os campos continuam editáveis. Frete não é somado.
- DIFAL no XML deixa de exigir escolha/fundamento para revenda, operação interna e CRT=1; regras para consumidor final não contribuinte em regime normal continuam explícitas. Isso não decide recolhimento por guia.
- Referências oficiais: MOC, regra 521/exceção para entrega na UF do emitente: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=dgIA1+97QzE%3D ; NT 2024.001, regra 694/exceção CRT=1: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=kIiniiSkpKc%3D ; NT 2021.004, modalidade 3: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=i0rK6ogxnx8%3D .
- Validação: 14 testes fiscais e 6 de preenchimento; teste de navegador com CNPJ e entrega separada, sem emitir nota em produção.


### CFOP automático (13/10/2026)
O CFOP aparece como valor no formulário, é recalculado quando muda o destino/contribuinte e é enviado no payload. O backend aplica a mesma regra quando o item vier sem CFOP. Códigos editados manualmente são preservados; se incompatíveis, a emissão é bloqueada. O atalho de entrega na loja usa o destino interno, mantendo o cadastro da cliente em GO. Validação: 16 testes fiscais + 6 de preenchimento, além do navegador.
