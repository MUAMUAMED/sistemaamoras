# Changelog - Funcionalidade de Rascunhos

## Data: 2024

### Funcionalidade: Salvar Produto como Rascunho

Implementada funcionalidade completa para salvar produtos como rascunhos, permitindo criar produtos com informações parciais e finalizá-los posteriormente.

## Mudanças no Backend

### 1. Schema do Prisma (`backend/prisma/schema.prisma`)
- ✅ Adicionado campo `isDraft Boolean @default(false)` no modelo `Product`
- ✅ Tornados opcionais os campos: `name`, `categoryId`, `sizeId`, `patternId`, `price`, `barcode`
- ✅ Ajustadas relações para aceitar campos opcionais

### 2. Migration (`backend/migrations/004_add_draft_support.sql`)
- ✅ Adicionada coluna `isDraft` na tabela `products`
- ✅ Tornada coluna `barcode` nullable
- ✅ Tornadas nullable as colunas: `name`, `categoryId`, `sizeId`, `patternId`, `price`
- ✅ Criado índice para melhor performance em consultas de rascunhos

### 3. Rotas de Produtos (`backend/src/routes/product.routes.ts`)

#### POST `/api/products`
- ✅ Adicionado parâmetro `saveAsDraft` no body
- ✅ Quando `saveAsDraft: true`:
  - Não valida campos obrigatórios
  - Não gera código de barras
  - Não gera QR Code
  - Salva todas as informações fornecidas (mesmo que incompletas)
  - Define `isDraft: true`

#### POST `/api/products/:id/create`
- ✅ Nova rota para converter rascunho em produto
- ✅ Valida todos os campos obrigatórios
- ✅ Gera código de barras
- ✅ Gera QR Code
- ✅ Define `isDraft: false`
- ✅ Registra movimentação de estoque (se houver)

#### GET `/api/products`
- ✅ Adicionado parâmetro de query `isDraft`
- ✅ Filtro padrão: mostra apenas produtos completos e ativos (não rascunhos)
- ✅ `isDraft=true`: mostra apenas rascunhos
- ✅ `isDraft=false`: mostra apenas produtos completos e ativos

#### PUT `/api/products/:id`
- ✅ Ajustado para não gerar código de barras quando produto é rascunho
- ✅ Permite atualizar rascunhos sem validações obrigatórias

## Mudanças no Frontend

### Documentação (`FRONTEND_DRAFT_IMPLEMENTATION.md`)
- ✅ Criado guia completo de implementação
- ✅ Exemplos de código React para:
  - Formulário de criação com botão "Salvar como Rascunho"
  - Edição de rascunhos
  - Conversão de rascunho em produto
  - Listagem de rascunhos

## Comportamento

### Salvar como Rascunho
1. Usuário preenche formulário parcialmente
2. Clica em "Salvar como Rascunho"
3. Backend salva todas as informações fornecidas (sem validações)
4. Não gera código de barras
5. Produto fica marcado como `isDraft: true`

### Criar Produto a partir do Rascunho
1. Usuário edita o rascunho e completa informações obrigatórias
2. Clica em "Criar Produto"
3. Backend valida todos os campos obrigatórios
4. Gera código de barras
5. Gera QR Code
6. Define `isDraft: false`
7. Registra movimentação de estoque (se houver)

## Campos Obrigatórios para Criar Produto

Para converter um rascunho em produto, os seguintes campos são obrigatórios:
- `name` (Nome)
- `categoryId` (Categoria)
- `sizeId` (Tamanho)
- `patternId` (Estampa)
- `price` (Preço)
- `stock` (Estoque)

## Notas Importantes

1. **Rascunhos não aparecem em listagens normais**: Por padrão, a listagem de produtos mostra apenas produtos completos (`isDraft: false` e `active: true`)

2. **Rascunhos não têm código de barras**: O código de barras só é gerado quando o rascunho é convertido em produto

3. **Validação condicional**: O backend não valida campos obrigatórios para rascunhos, mas valida quando converte em produto

4. **Estoque**: Rascunhos podem ter estoque, mas a movimentação só é registrada quando o produto é criado

## Próximos Passos

Para usar a funcionalidade no frontend:
1. Implementar botão "Salvar como Rascunho" no formulário de criação
2. Implementar botão "Criar Produto" na edição de rascunhos
3. Adicionar filtro/lista de rascunhos
4. Adicionar indicadores visuais para rascunhos

