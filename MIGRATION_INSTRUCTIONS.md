# 🔄 Instruções de Migração - Adicionar Subcategorias

## ⚠️ PROBLEMA
O sistema em produção está apresentando erros 500 nas APIs de subcategorias e produtos porque o banco de dados não possui a tabela `subcategories` que foi adicionada recentemente.

## 🛠️ SOLUÇÃO
Execute a migração SQL no banco de dados de produção para adicionar a tabela de subcategorias.

## 📋 PASSOS PARA MIGRAÇÃO

### 1. Conectar ao Banco de Produção
```bash
# No EasyPanel ou onde estiver o PostgreSQL de produção
psql -U username -d database_name
```

### 2. Executar a Migração SQL
```sql
-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_categoryId_name_key" ON "subcategories"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_categoryId_code_key" ON "subcategories"("categoryId", "code");

-- AlterTable (Add subcategoryId to products)
ALTER TABLE "products" ADD COLUMN "subcategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 3. Verificar a Migração
```sql
-- Verificar se a tabela foi criada
\dt subcategories

-- Verificar a estrutura da tabela
\d subcategories

-- Verificar se a coluna foi adicionada em products
\d products
```

### 4. Reiniciar o Servidor Backend
Após executar a migração, reinicie o container/aplicação backend no EasyPanel.

## ✅ VERIFICAÇÃO
Após a migração, as seguintes URLs devem funcionar:
- `GET /api/subcategories` - Listar subcategorias
- `POST /api/subcategories` - Criar subcategoria
- `GET /api/products` - Listar produtos (com suporte a subcategorias)

## 🚨 BACKUP
**IMPORTANTE**: Faça backup do banco de dados antes de executar a migração!

```bash
pg_dump -U username database_name > backup_antes_subcategorias.sql
```

## 📝 NOTAS
- A coluna `subcategoryId` em `products` é opcional (nullable)
- Produtos existentes continuarão funcionando normalmente
- As subcategorias são únicas por categoria (categoryId + name/code) 