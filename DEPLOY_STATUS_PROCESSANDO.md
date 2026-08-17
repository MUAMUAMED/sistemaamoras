# 🏭 Deploy - Status "Processando" para Produtos
## EasyPanel - Sistema Amoras Capital

---

## 🎯 NOVA FUNCIONALIDADE IMPLEMENTADA

✅ **Status "Processando" para Produtos**
- Novo campo `status` com enum ProductStatus (PROCESSANDO, ATIVO, INATIVO)
- Mudança visual do badge "Em Produção" para "Processando"
- Botão "Finalizar Processo" ao invés de "Finalizar Produção"
- Compatibilidade mantida com campo `inProduction` existente
- Migration SQL para migração dos dados

---

## 🚀 PASSO 1: FAZER COMMIT E PUSH DAS ALTERAÇÕES

```bash
git add .
git commit -m "feat: Implementa status 'Processando' para produtos

- Adiciona enum ProductStatus com status PROCESSANDO, ATIVO, INATIVO
- Atualiza interface para mostrar 'Processando' ao invés de 'Em Produção'
- Modifica botão para 'Finalizar Processo'
- Mantém compatibilidade com campo inProduction existente
- Cria migration para adicionar campo status
- Atualiza mensagens da API"

git push origin main
```

---

## 🗄️ PASSO 2: EXECUTAR MIGRATION NO BANCO DE DADOS

### Opção A: Via Terminal do Container Backend

1. **Acesse o EasyPanel**
2. **Vá para o container do Backend**
3. **Clique em "Terminal" ou "Console"**
4. **Execute:**

```bash
npx prisma db push
```

### Opção B: SQL Manual no PostgreSQL

Se a migration automática não funcionar, execute este SQL diretamente no PostgreSQL:

```sql
-- ===================================================
-- MIGRATION: STATUS PROCESSANDO PARA PRODUTOS
-- ===================================================

-- 1. Criar enum para status de produto
DO $$ BEGIN
    CREATE TYPE "ProductStatus" AS ENUM ('PROCESSANDO', 'ATIVO', 'INATIVO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar campo status na tabela produtos
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "status" "ProductStatus" NOT NULL DEFAULT 'PROCESSANDO';

-- 3. Migrar dados existentes baseado nos campos atuais
UPDATE "products" 
SET "status" = CASE 
    WHEN "inProduction" = true THEN 'PROCESSANDO'
    WHEN "active" = true THEN 'ATIVO'
    ELSE 'INATIVO'
END;

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS "idx_products_status" ON "products"("status");

-- 5. Adicionar comentário para documentação
COMMENT ON COLUMN "products"."status" IS 'Current status of the product: PROCESSANDO, ATIVO, or INATIVO';
```

---

## 🔧 PASSO 3: HABILITAR AS FUNCIONALIDADES COMPLETAS

Após a migration bem-sucedida, é necessário descomentar algumas linhas no código para habilitar todas as funcionalidades:

### No arquivo `backend/src/routes/product.routes.ts`:

1. **Linha 412** - Descomentar para que novos produtos comecem com status PROCESSANDO:
```typescript
// Mudar de:
// status: 'PROCESSANDO', // Produtos começam sempre como PROCESSANDO (será adicionado após migration)

// Para:
status: 'PROCESSANDO', // Produtos começam sempre como PROCESSANDO
```

2. **Linha 1653** - Atualizar verificação para usar o novo campo status:
```typescript
// Mudar de:
// Verificar se produto está em processamento (temporariamente usando inProduction)
if (!existingProduct.inProduction) {

// Para:
if (!existingProduct.inProduction && existingProduct.status !== 'PROCESSANDO') {
```

3. **Linha 1662** - Descomentar para atualizar status ao finalizar:
```typescript
// Mudar de:
data: {
  inProduction: false,
  // status: 'ATIVO', // Será habilitado após migration
},

// Para:
data: {
  inProduction: false,
  status: 'ATIVO',
},
```

---

## 📱 PASSO 4: TESTAR A FUNCIONALIDADE

1. **Criar um novo produto**
   - Verificar se aparece com badge "Processando"
   - Verificar se o botão "Finalizar Processo" está visível

2. **Finalizar processamento**
   - Clicar no botão "Finalizar Processo"
   - Verificar se o produto some da lista de processamento
   - Verificar se não mostra mais o badge "Processando"

3. **Produtos existentes**
   - Produtos com `inProduction: true` devem mostrar "Processando"
   - Botão de finalizar deve funcionar normalmente

---

## 🔍 VERIFICAÇÕES FINAIS

✅ **Interface atualizada:**
- Badge "Processando" ao invés de "Em Produção"
- Botão "Finalizar Processo" ao invés de "Finalizar Produção"
- Mensagem de confirmação atualizada

✅ **Backend atualizado:**
- Campo `status` adicionado ao schema
- Migration criada
- API atualizada com novas mensagens
- Compatibilidade mantida

✅ **Banco de dados:**
- Enum `ProductStatus` criado
- Campo `status` adicionado
- Dados migrados corretamente
- Índice para performance criado

---

## 🚨 ROLLBACK (se necessário)

Se algo der errado, execute este SQL para reverter:

```sql
-- Remover índice
DROP INDEX IF EXISTS "idx_products_status";

-- Remover campo status
ALTER TABLE "products" DROP COLUMN IF EXISTS "status";

-- Remover enum (cuidado - pode afetar outros usos)
DROP TYPE IF EXISTS "ProductStatus";
```

---

## 📞 SUPORTE

Se houver qualquer problema durante o deploy:
1. Verificar logs do container backend
2. Verificar se a migration foi executada corretamente
3. Confirmar se o banco de dados está acessível
4. Executar as verificações finais

A funcionalidade foi implementada mantendo total compatibilidade com o sistema existente.
