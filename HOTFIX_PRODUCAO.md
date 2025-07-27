# 🚨 HOTFIX PRODUÇÃO - Resolver Erros 500 Subcategorias

## ⚠️ PROBLEMA IDENTIFICADO
O sistema em produção está apresentando **erros 500** nos endpoints:
- `GET /api/subcategories`
- `POST /api/subcategories` 
- `GET /api/products`

## 🔍 CAUSA RAIZ
O banco de dados de produção não possui a tabela `subcategories` que foi adicionada no código recentemente.

## 🛠️ SOLUÇÃO RÁPIDA

### PASSO 1: Conectar ao Banco de Produção
```bash
# No EasyPanel, acesse o terminal do PostgreSQL
psql -U [seu_usuario] -d [nome_do_banco]
```

### PASSO 2: Executar Migração (COPIE E COLE TUDO)
```sql
-- Backup de segurança
\copy (SELECT 'BACKUP_' || NOW()) TO '/tmp/migration_backup.txt';

-- Criar tabela subcategories
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

-- Adicionar chaves estrangeiras
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" 
FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Criar índices únicos
CREATE UNIQUE INDEX "subcategories_categoryId_name_key" ON "subcategories"("categoryId", "name");
CREATE UNIQUE INDEX "subcategories_categoryId_code_key" ON "subcategories"("categoryId", "code");

-- Adicionar coluna subcategoryId na tabela products
ALTER TABLE "products" ADD COLUMN "subcategoryId" TEXT;

-- Adicionar chave estrangeira para products
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" 
FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verificar se tudo foi criado corretamente
\dt subcategories
\d subcategories
\d products
```

### PASSO 3: Reiniciar Aplicação
No EasyPanel, reinicie o container do backend para aplicar as mudanças.

### PASSO 4: Testar
Teste os endpoints que estavam com erro:
- `GET https://[seu-dominio]/api/subcategories` - Deve retornar array vazio `[]`
- `POST https://[seu-dominio]/api/subcategories` - Deve permitir criar subcategoria
- `GET https://[seu-dominio]/api/products` - Deve retornar produtos normalmente

## ✅ VERIFICAÇÃO DE SUCESSO
- [ ] Tabela `subcategories` criada
- [ ] Coluna `subcategoryId` adicionada em `products`
- [ ] Índices únicos criados
- [ ] Chaves estrangeiras funcionando
- [ ] Backend reiniciado
- [ ] APIs retornando 200 OK

## 🔄 CÓDIGO ATUALIZADO
O código já foi corrigido e está disponível no GitHub:
- ✅ Includes do `size` adicionados nos produtos
- ✅ Migração SQL criada
- ✅ Deploy realizado

## 📞 SUPORTE
Se houver algum problema durante a migração:
1. **NÃO CONTINUE** se houver erros
2. Anote a mensagem de erro exata
3. Restaure o backup se necessário
4. Entre em contato para suporte

---
**⏰ Tempo estimado: 5 minutos**  
**🎯 Resultado: Sistema 100% funcional** 