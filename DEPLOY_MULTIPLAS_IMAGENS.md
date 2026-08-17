# 🖼️ Deploy - Múltiplas Imagens por Produto

## Funcionalidade Implementada

✅ **Sistema de Múltiplas Imagens por Produto**
- Suporte a até 6 imagens por produto
- Dois tipos de imagens: **ROUPA** (fotos reais) e **IA** (imagens geradas)
- Upload múltiplo com preview e remoção individual
- Galerias separadas na visualização dos produtos
- Endpoints para gerenciamento completo das imagens
- Compatibilidade mantida com campo `imageUrl` legado

---

## 🚀 PASSOS PARA DEPLOY

### 1. APLICAR MIGRATION NO BANCO

Execute no container do backend ou no PostgreSQL:

```bash
# Opção 1: Via Prisma
npx prisma db push

# Opção 2: SQL Manual
psql -h localhost -U postgres -d amoras_capital -f /app/migrations/003_add_product_images.sql
```

**Arquivo SQL:** `backend/migrations/003_add_product_images.sql`

### 2. RESTART DOS CONTAINERS

```bash
# Se usando Docker
docker-compose restart backend frontend

# Se usando EasyPanel
# - Redeploy o backend
# - Redeploy o frontend
```

---

## 📋 FUNCIONALIDADES DISPONÍVEIS

### Backend (Endpoints)

1. **Upload de imagem única** (compatibilidade)
   - `POST /api/products/:id/image?type=ROUPA|IA&main=true`

2. **Upload múltiplo**
   - `POST /api/products/:id/images?type=ROUPA|IA`
   - Máximo 6 imagens por vez

3. **Listar imagens**
   - `GET /api/products/:id/images`

4. **Remover imagem**
   - `DELETE /api/products/:id/images/:imageId`

5. **Limite automático**
   - Máximo 6 imagens por produto
   - Validação no backend e frontend

### Frontend (Interface)

1. **Formulário de Produto**
   - Campo "Imagem Principal" (compatibilidade)
   - Campo "Imagens da Roupa" (múltiplas, máximo 6)
   - Campo "Imagens IA" (múltiplas, máximo 6)
   - Preview com remoção individual

2. **Visualização**
   - Cards de produto mostram primeira imagem disponível
   - Modal de detalhes com galerias separadas por tipo
   - Fallback para `imageUrl` quando não há imagens na galeria

---

## 🔧 CARACTERÍSTICAS TÉCNICAS

### Modelo de Dados

```sql
-- Nova tabela
CREATE TABLE "product_images" (
    "id" TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ProductImageType" NOT NULL, -- 'ROUPA' | 'IA'
    "position" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enum de tipos
CREATE TYPE "ProductImageType" AS ENUM ('ROUPA', 'IA');
```

### Compatibilidade

- Campo `Product.imageUrl` mantido para compatibilidade
- Produtos existentes funcionam normalmente
- Imagens antigas migradas automaticamente para nova tabela
- Fallbacks em caso de tabela não existir (evita erro 500)

### Limites

- **Máximo 6 imagens** por produto (configurável no código)
- **Tipos**: ROUPA e IA
- **Formatos**: aceitos pelo multer (jpg, png, gif, etc.)
- **Tamanho**: 5MB por arquivo (configurado no middleware)

---

## 🧪 COMO TESTAR

1. **Criar Produto**
   - Selecione imagens para "Imagens da Roupa"
   - Selecione imagens para "Imagens IA"
   - Verifique preview com botão de remoção

2. **Visualizar Produto**
   - Abra detalhes do produto
   - Confirme galerias separadas por tipo
   - Teste com produtos antigos (deve mostrar `imageUrl`)

3. **Limites**
   - Tente selecionar mais de 6 imagens
   - Confirme que apenas 6 são aceitas

---

## 🔍 VERIFICAÇÕES PÓS-DEPLOY

✅ **Backend**
- [ ] Endpoints respondem corretamente
- [ ] Upload múltiplo funciona
- [ ] Limite de 6 imagens é respeitado
- [ ] Fallbacks funcionam sem erro 500

✅ **Frontend**
- [ ] Formulário exibe campos corretos
- [ ] Preview de imagens funciona
- [ ] Remoção individual funciona
- [ ] Galerias separadas aparecem nos detalhes

✅ **Banco**
- [ ] Tabela `product_images` criada
- [ ] Enum `ProductImageType` criado
- [ ] Imagens antigas migradas
- [ ] Relacionamentos funcionando

---

## 🚨 ROLLBACK (se necessário)

```sql
-- Remover tabela e dados
DROP TABLE IF EXISTS "product_images";
DROP TYPE IF EXISTS "ProductImageType";

-- Reverter código para commit anterior
git revert HEAD
```

---

## 📞 SUPORTE

Se houver problemas:

1. **Verificar logs** do container backend
2. **Confirmar migration** foi executada
3. **Testar endpoints** manualmente
4. **Verificar permissões** da pasta uploads
5. **Validar** estrutura do banco

A funcionalidade foi implementada com máxima compatibilidade e fallbacks para garantir estabilidade.
