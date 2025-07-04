# 🧾 Sistema de Códigos de Barras e QR Code - Amoras Capital

## 🎯 **Visão Geral**

O sistema de códigos da **Amoras Capital** foi desenvolvido para facilitar a identificação e venda de produtos no PDV (Ponto de Venda). Cada produto recebe um código único baseado em suas características principais.

---

## 🧬 **Estrutura do Código**

### **Formato: TTCCEEEE**

| Parte | Significado           | Exemplo               | Descrição                    |
| ----- | --------------------- | --------------------- | ---------------------------- |
| TT    | Tamanho (2 dígitos)   | M = `05`              | Código do tamanho do produto |
| CC    | Categoria (2 dígitos) | Vestido = `50`        | Código da categoria          |
| EEEE  | Estampa (4 dígitos)   | Azul Marinho = `0032` | Código da estampa/cor        |

### **Exemplo Completo**
- **Tamanho**: M (05)
- **Categoria**: Vestido (50)  
- **Estampa**: Azul Marinho (0032)
- **Código Final**: `05500032`

---

## 📋 **Mapeamento de Códigos**

### **Tamanhos**
| Tamanho | Código | Descrição |
| ------- | ------ | --------- |
| PP      | 01     | Extra Pequeno |
| P       | 02     | Pequeno |
| M       | 03     | Médio |
| G       | 04     | Grande |
| GG      | 05     | Extra Grande |
| XG      | 06     | Extra Extra Grande |
| XGG     | 07     | Extra Extra Extra Grande |

### **Categorias**
| Categoria | Código | Descrição |
| --------- | ------ | --------- |
| Vestidos  | 10     | Vestidos femininos |
| Blusas    | 20     | Blusas e camisetas |
| Calças    | 30     | Calças e leggings |
| Saias     | 40     | Saias e shorts-saias |
| Conjuntos | 50     | Conjuntos femininos |
| Acessórios| 60     | Acessórios e bijuterias |

### **Estampas**
| Estampa      | Código | Descrição |
| ------------ | ------ | --------- |
| Liso Preto   | 0001   | Tecido liso preto |
| Liso Branco  | 0002   | Tecido liso branco |
| Liso Vermelho| 0003   | Tecido liso vermelho |
| Liso Azul    | 0004   | Tecido liso azul |
| Liso Rosa    | 0005   | Tecido liso rosa |
| Floral Rosa  | 0010   | Estampa floral rosa |
| Floral Azul  | 0011   | Estampa floral azul |
| Poá Preto    | 0020   | Poá preto e branco |
| Listras Marinhas| 0030 | Listras azul marinho |
| Animal Print | 0040   | Estampa animal print |
| Geométrica   | 0050   | Estampa geométrica |
| Tropical     | 0060   | Estampa tropical |

---

## 🖨️ **Geração Automática**

### **Quando o Código é Gerado**
1. **Criação de Produto**: Ao cadastrar um novo produto no sistema
2. **Geração Manual**: Através da API `/api/barcode/generate`
3. **Atualização**: Quando alterar tamanho, categoria ou estampa

### **O que é Gerado**
- **SKU**: Código no formato TTCCEEEE (ex: `05500032`)
- **Código de Barras**: EAN-13 baseado no SKU (ex: `789055000320`)
- **QR Code**: Imagem contendo informações do produto

---

## 📲 **QR Code - Informações Incluídas**

O QR Code contém um JSON com as seguintes informações:

```json
{
  "sku": "05500032",
  "size": "M",
  "category": "Vestido", 
  "pattern": "Azul Marinho",
  "company": "Amoras Capital",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🔧 **APIs Disponíveis**

### **1. Gerar Códigos**
```http
POST /api/barcode/generate
Content-Type: application/json

{
  "sizeId": "clx123456",
  "categoryId": "clx789012", 
  "patternId": "clx345678"
}
```

**Resposta:**
```json
{
  "sku": "05500032",
  "barcode": "789055000320",
  "qrcodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### **2. Escanear Código**
```http
POST /api/barcode/scan
Content-Type: application/json

{
  "code": "05500032"
}
```

**Resposta:**
```json
{
  "product": {
    "id": "clx123456",
    "name": "Vestido Floral",
    "price": 89.90,
    "stock": 5,
    "category": { "name": "Vestido" },
    "pattern": { "name": "Azul Marinho" }
  },
  "isValid": true
}
```

### **3. Testar Geração**
```http
GET /api/barcode/test
```

### **4. Listar Códigos Disponíveis**
```http
GET /api/barcode/codes
```

---

## 🛒 **Uso no PDV (Ponto de Venda)**

### **Fluxo de Venda**
1. **Atendente** abre tela de "Nova Venda"
2. **Escaneia** QR Code do produto com leitor ou câmera
3. **Sistema** identifica automaticamente o produto
4. **Exibe** informações: nome, preço, estoque, tamanho, estampa
5. **Atendente** escolhe quantidade e finaliza venda

### **Vantagens**
- ✅ **Rápido**: Evita busca manual no sistema
- ✅ **Preciso**: Reduz erros de digitação
- ✅ **Eficiente**: Identifica tamanho e estampa automaticamente
- ✅ **Versátil**: Funciona com leitor USB, câmera ou webcam

---

## 🖨️ **Impressão de Códigos**

### **Etiquetas Recomendadas**
- **Tamanho**: 40mm x 30mm
- **Material**: Papel térmico ou adesivo
- **Informações**: SKU, QR Code, nome do produto

### **Layout Sugerido**
```
┌─────────────────────────┐
│     [QR Code]           │
│                         │
│  SKU: 05500032          │
│  Vestido Azul Marinho   │
│  Tamanho: M             │
└─────────────────────────┘
```

---

## 🔍 **Validação e Segurança**

### **Validação de Códigos**
- **SKU**: Deve ter exatamente 8 dígitos
- **Código de Barras**: EAN-13 válido com dígito verificador
- **QR Code**: Contém informações completas do produto

### **Limites de Códigos**
- **Tamanhos**: Máximo 2 dígitos numéricos (ex: 01, 05, 10)
- **Categorias**: Máximo 2 dígitos numéricos (ex: 10, 50)
- **Estampas**: Máximo 4 dígitos numéricos (ex: 0001, 0032)

### **Validações Implementadas**
- ✅ **Backend**: Validação automática ao criar/editar
- ✅ **Frontend**: Validação em tempo real nos formulários
- ✅ **Formatação**: Zeros à esquerda automaticamente
- ✅ **Verificação**: Impede códigos duplicados
- ✅ **Limpeza**: Remove caracteres não numéricos

### **Verificação de Duplicatas**
- Sistema verifica se código já existe antes de gerar
- Impede criação de produtos com códigos duplicados
- Gera códigos únicos automaticamente

### **API de Validação**
```http
GET /api/barcode/validate-codes
```

**Resposta:**
```json
{
  "valid": [
    { "type": "size", "name": "M", "code": "05" },
    { "type": "category", "name": "Vestido", "code": "50" }
  ],
  "invalid": [
    { "type": "pattern", "name": "Azul", "code": "ABC123", "issue": "Código deve ter 1-4 dígitos numéricos" }
  ],
  "summary": {
    "total": 15,
    "valid": 14,
    "invalid": 1
  },
  "recommendations": [
    "Corrija os códigos inválidos para garantir compatibilidade",
    "Use apenas números nos códigos"
  ]
}
```

---

## 📊 **Exemplos Práticos**

### **Exemplo 1: Vestido Floral Rosa Tamanho M**
- **Tamanho M**: 03
- **Categoria Vestido**: 10  
- **Estampa Floral Rosa**: 0010
- **SKU**: `03100010`
- **Código de Barras**: `789031000100`

### **Exemplo 2: Blusa Liso Preto Tamanho G**
- **Tamanho G**: 04
- **Categoria Blusa**: 20
- **Estampa Liso Preto**: 0001  
- **SKU**: `04200001`
- **Código de Barras**: `789042000010`

### **Exemplo 3: Calça Animal Print Tamanho GG**
- **Tamanho GG**: 05
- **Categoria Calça**: 30
- **Estampa Animal Print**: 0040
- **SKU**: `05300040`
- **Código de Barras**: `789053000400`

---

## 🚀 **Próximos Passos**

### **Implementações Futuras**
- [ ] **Scanner de Código**: Interface web para escanear códigos
- [ ] **Relatórios**: Estatísticas de uso dos códigos
- [ ] **Integração**: Conectar com sistema de estoque
- [ ] **Mobile**: App para escanear códigos no celular

### **Melhorias Técnicas**
- [ ] **Cache**: Otimizar busca de produtos por código
- [ ] **Logs**: Registrar todas as operações de escaneamento
- [ ] **Backup**: Sistema de backup dos códigos gerados

---

## 📞 **Suporte**

Para dúvidas ou problemas com o sistema de códigos:

- **Email**: suporte@amorascapital.com
- **WhatsApp**: (11) 99999-9999
- **Documentação**: Este arquivo e comentários no código

---

*Sistema desenvolvido para a Amoras Capital - 2024* 