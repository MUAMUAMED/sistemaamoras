# Conferência da loja e reposição — Android 1.0.28

## Conferência da loja

No menu do aplicativo, abra **Conferência da loja** e inicie a contagem. O servidor salva o saldo inicial de todos os produtos ativos, fora de rascunho, que têm estoque na loja. Cada leitura de QR/SKU ou código de barras conta **uma unidade**. A câmera fecha após a leitura; abra novamente para contar outra peça, inclusive quando a etiqueta é igual. Também é possível digitar o código e informar várias unidades ou corrigir a quantidade encontrada de cada produto.

A contagem fica salva no servidor e pode ser retomada com o mesmo usuário. A loja inteira deve ser conferida antes de finalizar. Uma conferência da loja pode ficar aberta por vez. O aplicativo requer conexão; uma leitura sem resultado confirmado fica pendente e pode ser reenviada sem contagem duplicada.

Em **Revisar baixas e diferenças**, o sistema mostra as unidades faltantes, excedentes e os produtos não encontrados. Ao confirmar, o saldo da loja passa a ser a quantidade contada. O armazém permanece com seu saldo; o total é recalculado pela soma dos dois locais. Toda diferença gera uma movimentação com responsável, motivo e referência da conferência. Nenhuma venda, receita ou pagamento é criado automaticamente.

Se uma venda, entrada, edição ou transferência alterar um produto durante a conferência, o servidor bloqueia a conclusão e solicita atualizar/recontar esse produto. Novos produtos com estoque na loja também precisam ser incluídos e contados. Uma revisão antiga não pode ser aplicada. Cancelar a conferência encerra a contagem sem ajustes. Uma conferência sem nenhuma peça contada exige confirmar explicitamente que a loja está vazia.

## Reposição

Abra **Reposição**, tire uma ou duas fotos e toque em **Buscar roupas semelhantes**. A busca compara vetores de imagem existentes no pgvector, retorna produtos/variantes e mostra nome, estampa, tamanho e saldos. A pessoa escolhe a roupa correta; o percentual de similaridade não é uma certeza de identificação. Há também busca por nome/código e paginação do catálogo.

Depois de selecionar, escolha **Loja** ou **Armazém**, **Aumentar** ou **Diminuir**, quantidade e motivo. A confirmação mostra o saldo antes/depois. O servidor atualiza o saldo do local e o total em uma transação, registra o histórico e impede saldo negativo. Uma operação pendente pode ser reenviada e não duplica a movimentação, inclusive após fechar o app.

## API e publicação

As rotas autenticadas ficam em `/api/mobile-stock`. O backend cria somente as quatro novas tabelas aditivas na inicialização, sem sincronizar ou apagar estruturas existentes. Também é possível executar `npm run stock:setup` explicitamente. Gere o Prisma Client antes do build (`npx prisma generate && npm run build`).

Embeddings diretos da Google: defina `IMAGE_EMBEDDING_PROVIDER=google`, `IMAGE_EMBEDDING_MODEL=google/gemini-embedding-2` e uma chave em `IMAGE_EMBEDDING_API_KEY` no serviço do backend. A chave dedicada não altera a configuração das demais IAs. O transporte usa `embedContent`, aceita até seis fotos em um único vetor de 768 dimensões e mantém o identificador já usado no pgvector. Uma resposta 429 informa a cota esgotada sem fallback automático para um provedor pago. `npm run test:embeddings` valida payload, autenticação, dimensão, tratamento de cota e proteção da chave com respostas simuladas.

A reposição respeita `VECTOR_DATABASE_URL`: os vetores podem estar em outro PostgreSQL. Os dados do produto são carregados do ERP. Fotos enviadas só para consulta são removidas após a busca; não criam produtos ou estampas. Fotos do catálogo precisam estar indexadas com o mesmo modelo e as mesmas 768 dimensões. O provedor atual permanece configurado pelo servidor; nenhum segredo vai no APK.

## Validação

`npm run build` e `npx prisma validate` no backend; `npx tsc --noEmit` no aplicativo. `npm run test:stock` utiliza PostgreSQL isolado em `127.0.0.1:55439`, nunca o banco da loja. São nove cenários: autenticação, retomada e isolamento, leituras idempotentes, baixas e preservação do armazém, reposição e estoque negativo, concorrência, revisão/recontagem, cancelamento/contagem vazia e busca vetorial/variantes. A chamada ao provedor vetorial é simulada no teste para não gastar créditos; o restante usa HTTP e PostgreSQL reais.
