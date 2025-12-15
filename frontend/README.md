# Frontend - Typebot Chatwoot Connector

Frontend desenvolvido com Next.js 14, seguindo o design system Opensheets.

## Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Estilização com cores OKLCH
- **shadcn/ui** - Componentes UI (estilo "new-york")
- **Radix UI** - Componentes acessíveis
- **Remix Icon** - Biblioteca de ícones
- **next-themes** - Gerenciamento de tema (Dark Mode)
- **Axios** - Cliente HTTP

## Instalação

```bash
cd frontend
npm install
```

## Configuração

Crie um arquivo `.env.local` na raiz do frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3001` (ou outra porta disponível).

**Nota:** O projeto utiliza **Turbopack** para desenvolvimento, proporcionando compilação até 10x mais rápida e hot reload instantâneo.

## Build

```bash
npm run build
npm start
```

**Nota:** O build de produção utiliza **Turbopack** (`--turbo`), proporcionando builds significativamente mais rápidos (2x a 5x mais rápido que Webpack). O Next.js 16+ suporta Turbopack nativamente em desenvolvimento e produção.

## Docker

O projeto está configurado para **desenvolvimento por padrão** com hot reload automático.

### Modo Desenvolvimento (Padrão - Hot Reload)

Servidor de desenvolvimento com Turbopack e hot reload em tempo real:

```bash
# Valores padrão (não precisa configurar nada):
# FRONTEND_BUILD_ENV=development
# FRONTEND_BUILD_TARGET=runner-dev
# FRONTEND_NODE_ENV=development

cd docker
docker-compose up -d frontend
```

**Características:**
- 🔥 Hot reload automático - alterações refletem instantaneamente
- 📁 Volumes montados para sincronização em tempo real
- ⚡ Turbopack para máxima velocidade de compilação
- 🐳 Funciona perfeitamente no Docker

### Modo Produção (Quando Solicitado)

Build otimizado com Turbopack para produção:

```bash
# No .env do docker-compose, defina:
FRONTEND_BUILD_ENV=production
FRONTEND_BUILD_TARGET=runner-prod
FRONTEND_NODE_ENV=production

# Rebuild a imagem
cd docker
docker-compose build frontend
docker-compose up -d frontend
```

**Benefícios do Turbopack:**
- ⚡ Build de produção 2x a 5x mais rápido que Webpack
- 🔥 Hot reload instantâneo em desenvolvimento
- 📦 Imagens Docker menores e mais eficientes (standalone)
- 🚀 Performance otimizada em runtime
- ✅ Compatibilidade total com PostCSS e Tailwind CSS
- 🎯 Suporte nativo em Next.js 16+ para dev e produção

## Estrutura

```
frontend/
├── app/                    # App Router do Next.js
│   ├── dashboard/         # Páginas do dashboard
│   ├── login/             # Página de login
│   ├── layout.tsx         # Layout raiz
│   └── globals.css        # Estilos globais com variáveis OKLCH
├── components/
│   ├── ui/                # Componentes shadcn/ui
│   ├── layout/            # Componentes de layout
│   └── theme-provider.tsx # Provider de tema
├── lib/
│   ├── api.ts             # Cliente Axios configurado
│   └── utils.ts           # Utilitários (cn, etc)
├── hooks/
│   └── use-toast.ts       # Hook para notificações
└── middleware.ts          # Middleware de proteção de rotas
```

## Funcionalidades

- ✅ Autenticação (Login)
- ✅ Dashboard com estatísticas
- ✅ Gerenciamento de Tenants (CRUD)
- ✅ Gerenciamento de Inboxes (CRUD)
- ✅ Dark Mode
- ✅ Notificações (Toast)
- ✅ Proteção de rotas

## Design System

O frontend segue o design system Opensheets com:
- Cores em OKLCH (espaço de cores perceptual)
- Paleta terracota/laranja com tons creme
- Tipografia moderna
- Componentes acessíveis (Radix UI)
- Animações suaves

Veja `DESIGN_SYSTEM.md` na raiz do projeto para mais detalhes.

