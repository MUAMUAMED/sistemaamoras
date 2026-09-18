# 🏪 Deploy - Sistema de Estoque por Localização
## EasyPanel - Sistema Amoras Capital

---

## 🎯 NOVA FUNCIONALIDADE IMPLEMENTADA

✅ **Controle de Estoque por Localização (Loja/Armazém)**
- Separação completa entre estoque da Loja e Armazém
- Botões de entrada e saída por localização
- Modal de transferência entre estoques
- Interface visual aprimorada
- APIs completas para gestão

---

## 🚀 PASSO 1: FAZER COMMIT E PUSH DAS ALTERAÇÕES

```bash
git add .
git commit -m "feat: Sistema de estoque por localização (Loja/Armazém)

- Adiciona campos stockLoja e stockArmazem na tabela Product
- Cria enum StockLocation e campos para movimentações
- Implementa APIs de entrada/saída por localização  
- Adiciona modal de transferência entre estoques
- Atualiza interface para mostrar estoque separado
- Melhora botões de ação dos produtos"

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
npx prisma migrate deploy
```

### Opção B: SQL Manual no PostgreSQL

Se a migration não funcionar, execute este SQL diretamente no PostgreSQL:

```sql
-- ===================================================
-- MIGRATION: ESTOQUE POR LOCALIZAÇÃO
-- ===================================================

-- 1. Adicionar campos de estoque por localização
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "stockLoja" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "stockArmazem" INTEGER NOT NULL DEFAULT 0;

-- 2. Criar enum para localização de estoque
DO $$ BEGIN
    CREATE TYPE "StockLocation" AS ENUM ('LOJA', 'ARMAZEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Adicionar campos de localização nas movimentações
ALTER TABLE "stock_movements"
ADD COLUMN IF NOT EXISTS "location" "StockLocation",
ADD COLUMN IF NOT EXISTS "fromLocation" "StockLocation", 
ADD COLUMN IF NOT EXISTS "toLocation" "StockLocation";

-- 4. Atualizar produtos existentes (dividir estoque atual entre loja e armazém)
UPDATE "products" 
SET 
    "stockLoja" = CASE 
        WHEN "stock" > 0 THEN "stock" 
        ELSE 0 
    END,
    "stockArmazem" = 0
WHERE "stockLoja" = 0 AND "stockArmazem" = 0;

-- 5. Verificar se migration foi aplicada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('stockLoja', 'stockArmazem');

SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
AND column_name IN ('location', 'fromLocation', 'toLocation');
```

---

## 🔄 PASSO 3: DEPLOY NO EASYPANEL

### 3.1 Deploy Backend

1. **Acesse seu projeto no EasyPanel**
2. **Vá para o container/serviço do Backend**
3. **Clique em "Deploy Now" ou "Redeploy"**
4. **Aguarde o deploy concluir**
5. **Verifique os logs** - deve aparecer: `[INFO] Servidor rodando na porta...`

### 3.2 Deploy Frontend

1. **Vá para o container/serviço do Frontend**
2. **Clique em "Deploy Now" ou "Redeploy"**
3. **Aguarde o deploy concluir**
4. **Verifique os logs** - deve mostrar build bem-sucedido

---

## ✅ PASSO 4: VERIFICAR SE TUDO FUNCIONOU

### 4.1 Teste das APIs

Teste os novos endpoints (substitua `[SEU-DOMINIO]` pelo seu domínio):

```bash
# 1. Verificar se produtos têm os novos campos
curl https://[SEU-DOMINIO]/api/products

# 2. Testar adição de estoque por localização
curl -X PATCH https://[SEU-DOMINIO]/api/products/[PRODUCT-ID]/stock/add-location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "quantity": 10,
    "location": "LOJA", 
    "reason": "Teste entrada loja"
  }'

# 3. Testar transferência entre estoques
curl -X PATCH https://[SEU-DOMINIO]/api/products/[PRODUCT-ID]/stock/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "quantity": 5,
    "fromLocation": "LOJA",
    "toLocation": "ARMAZEM",
    "reason": "Teste transferência"
  }'
```

### 4.2 Teste da Interface

1. **Acesse:** `https://[SEU-DOMINIO]`
2. **Vá para a página de Produtos**
3. **Verifique se aparece:**
   - ✅ Estoque separado por Loja/Armazém nos cards dos produtos
   - ✅ Botão "Transfer" nos produtos
   - ✅ Novo modal de transferência ao clicar em "Transfer"
   - ✅ Modal de estoque com seções "Estoque Geral" e "Por Localização"

---

## 🎉 FUNCIONALIDADES DISPONÍVEIS APÓS O DEPLOY

### 📦 Gestão de Estoque por Localização
- **Estoque da Loja** - Produtos disponíveis na loja física
- **Estoque do Armazém** - Produtos disponíveis no depósito/armazém
- **Estoque Total** - Soma automática dos dois estoques

### ⚡ Operações Disponíveis
- **Entrada por Localização** - Adicionar produtos diretamente na Loja ou Armazém
- **Saída por Localização** - Remover produtos de local específico
- **Transferência** - Mover produtos entre Loja ↔ Armazém
- **Entrada/Saída Geral** - Operações que afetam estoque total (compatibilidade)

### 🎨 Interface Aprimorada
- **Cards de Produto** - Mostram estoque separado (Loja: X / Armazém: Y)
- **Modal de Transferência** - Interface dedicada para transferências
- **Modal de Estoque Melhorado** - Suporte a todas as operações
- **Botões Organizados** - Layout otimizado em 2 linhas

### 📊 Rastreabilidade Completa
- **Histórico de Movimentações** - Todas as operações registradas
- **Tipos de Operação** - ENTRY, EXIT, TRANSFER, ADJUSTMENT, etc.
- **Localizações** - Origem e destino das transferências
- **Auditoria** - Usuário, data/hora, motivo de cada operação

---

## 🔧 TROUBLESHOOTING

### ❌ Se o deploy não funcionar:
1. **Verifique os logs** do container no EasyPanel
2. **Confirme se o GitHub** está conectado corretamente
3. **Tente deploy manual** via terminal: `git pull && npm run build`

### ❌ Se a migration falhar:
1. **Execute SQL manual** conforme Passo 2, Opção B
2. **Verifique permissões** do usuário PostgreSQL
3. **Execute comandos um por vez** se necessário

### ❌ Se a interface não mostrar as mudanças:
1. **Limpe o cache** do navegador (Ctrl+F5)
2. **Verifique se o frontend** foi deployado
3. **Confirme se os novos campos** existem na API: `/api/products`

### ❌ Se APIs retornarem erro 500:
1. **Verifique se a migration** foi executada
2. **Confirme se os novos campos** existem no banco
3. **Reinicie o container** do backend

---

## 📞 VERIFICAÇÃO FINAL

### ✅ Checklist de Sucesso:
- [ ] **Migration executada** (campos stockLoja, stockArmazem existem)
- [ ] **Backend deployado** (sem erros nos logs)
- [ ] **Frontend deployado** (build bem-sucedido)
- [ ] **Interface atualizada** (estoque por localização visível)
- [ ] **Botão Transfer** funciona nos produtos
- [ ] **Modal de transferência** abre corretamente
- [ ] **APIs respondem** corretamente

### 🎯 Como Testar Rapidamente:
1. Acesse a página de produtos
2. Clique em qualquer produto no botão "Transfer"
3. Teste transferir 1 unidade da Loja para o Armazém
4. Verifique se os números de estoque atualizam

---

## 🏆 RESULTADO FINAL

Após seguir todos os passos, você terá:

🎉 **Sistema completo de gestão de estoque com separação por localização**
📦 **Controle independente entre Loja e Armazém**  
⚡ **Interface intuitiva para todas as operações**
📊 **Histórico completo e auditoria de movimentações**
🔄 **APIs REST para integração externa**

**⏰ Tempo estimado: 15-20 minutos**
**🎯 Resultado: Funcionalidade 100% operacional**

---

**🆘 Suporte:** Se encontrar problemas, verifique os logs em tempo real no EasyPanel e compare com este guia.