# E-commerce Amoras Capital 🌿

## Design System Inspirado na FARM

Site de vendas da marca **Amoras Capital** com identidade visual tropical, boêmia e autêntica.

## 🎨 Identidade Visual

### Paleta de Cores

#### Cores Base
- **Cream** (#FAF8F3) - Fundo principal
- **Sand** (#F5EFE6) - Fundo alternativo
- **Off-White** (#FDFCF9) - Áreas de destaque

#### Cores Natureza (Verde)
- **Green Deep** (#2F5233) - Principal
- **Green Forest** (#3D6B42) - Secundário
- **Green Leaf** (#5A8D5F) - Hover states
- **Green Light** (#B8D4B9) - Backgrounds suaves

#### Cores Solares (Laranja)
- **Orange Burnt** (#D97642) - CTAs
- **Orange Warm** (#E89563) - Destaque
- **Terracotta** (#C76541) - Hover CTAs
- **Coral** (#F2A07B) - Acentos

#### Cores Amoras (Marca)
- **Purple Deep** (#4A2947) - Logo/Marca
- **Magenta Subtle** (#8B5A7C) - Seleções
- **Plum** (#6B4563) - Variações

### Tipografia

#### Headings (Títulos)
- **Font**: Fraunces (Serif)
- **Estilo**: Elegante, orgânico, com personalidade
- **Uso**: H1, H2, H3, H4, H5, H6, destaque editorial

#### Body (Corpo)
- **Font**: Inter (Sans-Serif)
- **Estilo**: Moderna, geométrica, legível
- **Uso**: Parágrafos, botões, navegação

### Formas e Layout

- **Layout Fluido**: Assimetria controlada
- **Border Radius**: Levemente arredondado (8-16px)
- **Divisores**: Curvas suaves, texturas rasgadas
- **Espaçamento**: Generoso, respiro entre elementos
- **Cards**: Minimalistas com bastante whitespace

## 📦 Estrutura do Projeto

```
ecommerce/
├── src/
│   ├── assets/          # Imagens, ícones, SVGs
│   ├── components/      # Componentes React
│   │   ├── layout/      # Header, Footer, Layout
│   │   ├── home/        # Hero, CategoryCarousel, ProductGrid
│   │   ├── product/     # ProductCard, ProductDetail
│   │   ├── cart/        # Cart, CartItem
│   │   └── common/      # Button, Input, Modal, etc.
│   ├── pages/           # Páginas da aplicação
│   │   ├── Home.tsx
│   │   ├── Products.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── Cart.tsx
│   │   └── Checkout.tsx
│   ├── lib/             # Configurações e utilitários
│   │   └── api.ts       # Cliente Axios
│   ├── store/           # Gerenciamento de estado (Zustand)
│   │   └── cart.ts      # Estado do carrinho
│   ├── styles/          # Estilos globais
│   │   └── design-system.css
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Componente principal
│   ├── main.tsx         # Entry point
│   └── index.css        # Estilos globais
├── public/              # Assets públicos
├── .env.example         # Variáveis de ambiente exemplo
└── package.json
```

## 🛠️ Tecnologias Utilizadas

### Core
- **Vite** - Build tool ultra-rápido
- **React 19** - Biblioteca UI
- **TypeScript** - Type safety

### Roteamento & Estado
- **React Router DOM** - Navegação
- **Zustand** - Gerenciamento de estado (carrinho)
- **@tanstack/react-query** - Cache e sincronização de dados

### Requisições & Animações
- **Axios** - Cliente HTTP
- **Framer Motion** - Animações fluidas

### UI & Ícones
- **Lucide React** - Ícones modernos

## 🚀 Como Rodar o Projeto

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
copy .env.example .env
```

Edite o `.env` com as configurações corretas:
```
VITE_API_URL=http://localhost:3000/api
VITE_UPLOAD_URL=http://localhost:3000
```

### 3. Rodar em Desenvolvimento
```bash
npm run dev
```

O site estará disponível em: `http://localhost:5173`

### 4. Build para Produção
```bash
npm run build
```

### 5. Preview da Build
```bash
npm run preview
```

## 🎯 Próximos Passos

### Componentes a Criar

1. **Layout Components**
   - [ ] Header (com scroll transparente)
   - [ ] Footer (fundo verde escuro)
   - [ ] MainLayout

2. **Home Components**
   - [ ] Hero Section (full-width, video/imagem)
   - [ ] CategoryCarousel (ícones circulares)
   - [ ] ProductGrid (cards com hover fade)
   - [ ] ManifestoSection (layout assimétrico)

3. **Product Components**
   - [ ] ProductCard (hover image transition)
   - [ ] ProductDetail (galeria + info)
   - [ ] ProductGallery
   - [ ] SizeSelector
   - [ ] ColorSelector
   - [ ] AddToCartButton

4. **Cart Components**
   - [ ] CartDrawer (slide-in lateral)
   - [ ] CartItem
   - [ ] CartSummary

5. **Common Components**
   - [ ] Button (primary, secondary, outline, ghost)
   - [ ] Input
   - [ ] Modal
   - [ ] Loading
   - [ ] EmptyState

### Páginas a Criar

- [ ] Home (`/`)
- [ ] Products (`/produtos`)
- [ ] ProductDetail (`/produtos/:slug`)
- [ ] Cart (`/carrinho`)
- [ ] Checkout (`/checkout`)
- [ ] About (`/sobre`)
- [ ] Contact (`/contato`)

### Integrações

- [ ] Conectar com backend existente (Prisma + Express)
- [ ] Implementar busca de produtos
- [ ] Implementar filtros (categoria, preço, tamanho, cor)
- [ ] Implementar ordenação
- [ ] Sistema de autenticação (login/cadastro)
- [ ] Gateway de pagamento
- [ ] Cálculo de frete

## 🎨 Especificações de Design

### Header
- Transparente sobre o Hero
- Ganhar fundo sólido (off-white) ao fazer scroll
- Logo "Amoras Capital" centralizado
- Ícones: Busca, Conta, Carrinho (à direita)
- Menu hamburguer elegante (mobile)

### Hero Section
- Full-width
- Foto/vídeo lifestyle de alta qualidade
- Título grande em Serif
- CTA vibrante mas sofisticado
- Ex: "Descubra a Essência"

### Product Cards
- Minimalistas com respiro
- Imagem de fundo neutro por padrão
- **Hover Effect**: Fade para imagem lifestyle
- Botão "Adicionar à Sacola" aparece no hover
- Preço em destaque

### Footer
- Fundo verde escuro ou roxo amora
- Tipografia clara
- Campo newsletter minimalista com botão seta
- Links institucionais
- Ícones de redes sociais

## 📱 Mobile First

Toda a interface é pensada mobile-first, com breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🌿 Filosofia de Design

O design do Amoras Capital evoca:
- **Brasilidade**
- **Natureza**
- **Leveza**
- **Autenticidade**
- **Sofisticação**

Sem perder o foco em **conversão** e **experiência do usuário**.

---

**Desenvolvido com 💜 para Amoras Capital**
