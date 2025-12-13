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

## Build

```bash
npm run build
npm start
```

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

