# 🚀 Deploy para EasyPanel - Aplicar Correções Subcategorias

## 📋 OVERVIEW
Este guia explica como aplicar as correções dos erros 500 no projeto EasyPanel.

## 🔄 PASSO 1: Atualizar Código no EasyPanel

### Opção A: Deploy Automático via Git (Recomendado)
1. **Acesse o EasyPanel**
   - Vá para: https://[seu-easypanel]/
   - Faça login na sua conta

2. **Encontre seu Projeto Backend**
   - Clique no projeto `amoras-sistema` (ou nome similar)
   - Vá para a aba **"Source"** ou **"Deploy"**

3. **Trigger Deploy**
   - Clique em **"Deploy Now"** ou **"Redeploy"**
   - Ou se configurado, aguarde o deploy automático do GitHub

### Opção B: Deploy Manual
Se o deploy automático não estiver funcionando:
1. **Acesse o Terminal do Container**
   - No EasyPanel, vá para o container do backend
   - Clique em **"Terminal"** ou **"Console"**

2. **Atualize o Código**
   ```bash
   git pull origin main
   npm install
   npm run build
   ```

## 🗄️ PASSO 2: Executar Migração do Banco de Dados

### 2.1 Conectar ao PostgreSQL
1. **No EasyPanel, encontre o serviço PostgreSQL**
2. **Acesse o terminal/console do PostgreSQL** ou use pgAdmin
3. **Conecte ao banco:**
   ```bash
   psql -U [usuario] -d [nome_do_banco]
   ```

### 2.2 Executar Migração (COPIE E COLE TUDO)
```sql
-- Backup de segurança
\copy (SELECT 'BACKUP_' || NOW()) TO '/tmp/migration_backup.txt';

-- Criar tabela subcategories
CREATE TABLE IF NOT EXISTS "subcategories" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_categoryId_name_key" ON "subcategories"("categoryId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_categoryId_code_key" ON "subcategories"("categoryId", "code");

-- Adicionar coluna subcategoryId na tabela products (se não existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='subcategoryId') 
    THEN 
        ALTER TABLE "products" ADD COLUMN "subcategoryId" TEXT;
    END IF; 
END $$;

-- Adicionar chave estrangeira para products
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" 
FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verificar se tudo foi criado corretamente
\dt subcategories
\d subcategories
\d products
```

## 🔄 PASSO 3: Reiniciar Serviços

### 3.1 Reiniciar Backend
1. **No EasyPanel, vá para o container do backend**
2. **Clique em "Restart"** ou **"Reboot"**
3. **Aguarde alguns segundos** para reinicializar

### 3.2 Verificar Logs
1. **Clique em "Logs"** no container do backend
2. **Verifique se não há erros** na inicialização
3. **Procure por:** `[INFO] Servidor rodando na porta...`

## ✅ PASSO 4: Testar as Correções

### 4.1 Testar APIs
Teste os endpoints que estavam com erro 500:

```bash
# Listar subcategorias (deve retornar array vazio)
curl https://[seu-dominio]/api/subcategories

# Listar produtos (deve funcionar normalmente)
curl https://[seu-dominio]/api/products

# Teste no frontend
# Acesse: https://[seu-dominio]
# Vá para a seção de produtos/subcategorias
```

### 4.2 Verificação de Sucesso
- [ ] **Frontend carrega sem erros 500**
- [ ] **API `/api/subcategories` retorna `[]`**
- [ ] **API `/api/products` retorna produtos**
- [ ] **Console do navegador sem erros 500**

## 🔧 TROUBLESHOOTING

### Se o deploy não funcionar:
1. **Verifique os logs** do container
2. **Confirme se o GitHub** está conectado
3. **Tente deploy manual** via terminal

### Se a migração falhar:
1. **Verifique se conectou ao banco correto**
2. **Confirme permissões** do usuário
3. **Execute comandos um por vez** se necessário

### Se ainda houver erros 500:
1. **Verifique logs do backend** 
2. **Confirme se tabela foi criada**: `\dt subcategories`
3. **Reinicie o backend** novamente

## 📞 SUPORTE
- Verifique os logs em tempo real: **EasyPanel > Backend > Logs**
- Se continuar com problemas, compartilhe os logs de erro

---
**⏰ Tempo estimado total: 10-15 minutos**  
**🎯 Resultado: Sistema 100% funcional sem erros 500** 