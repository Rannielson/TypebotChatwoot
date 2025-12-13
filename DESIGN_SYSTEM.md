# 🎨 Design System - Opensheets

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Paleta de Cores](#paleta-de-cores)
3. [Tipografia](#tipografia)
4. [Ícones](#ícones)
5. [Espaçamento e Layout](#espaçamento-e-layout)
6. [Componentes](#componentes)
7. [Sombras](#sombras)
8. [Border Radius](#border-radius)
9. [Animações e Transições](#animações-e-transições)
10. [Dark Mode](#dark-mode)

---

## 🎯 Visão Geral

O Opensheets utiliza um design system moderno e sofisticado baseado em:

- **Framework de UI**: shadcn/ui (estilo "new-york")
- **Sistema de Cores**: OKLCH (espaço de cores perceptual moderno)
- **Framework CSS**: Tailwind CSS v4
- **Componentes Base**: Radix UI (acessibilidade nativa)
- **Tema**: Suporte completo a Light e Dark Mode

### Características Principais
- ✅ Design minimalista e elegante
- ✅ Paleta de cores quentes (terracota/laranja) com tons creme
- ✅ Tipografia moderna e legível
- ✅ Sistema de ícones consistente
- ✅ Animações suaves e interações polidas
- ✅ Acessibilidade em primeiro lugar

---

## 🎨 Paleta de Cores

O sistema utiliza **OKLCH** (OK Lightness Chroma Hue), um espaço de cores perceptual moderno que oferece melhor consistência visual e acessibilidade.

### Modo Claro (Light Mode)

#### Superfícies Base
```css
--background: oklch(97.512% 0.00674 67.377)      /* Creme quente com leve tom laranja */
--foreground: oklch(18% 0.02 45)                  /* Texto escuro */
--card: oklch(100% 0.00011 271.152)              /* Branco puro */
--card-foreground: oklch(18% 0.02 45)            /* Texto sobre card */
--popover: oklch(99.5% 0.004 80)                 /* Popover quase branco */
--popover-foreground: oklch(18% 0.02 45)         /* Texto sobre popover */
```

#### Cores Principais
```css
--primary: oklch(69.18% 0.18855 38.353)          /* Terracota rico/laranja */
--primary-foreground: oklch(98% 0.008 80)        /* Texto claro sobre primary */

--secondary: oklch(94% 0.018 70)                 /* Pedra quente com saturação sutil */
--secondary-foreground: oklch(25% 0.025 45)       /* Texto sobre secondary */

--muted: oklch(94.5% 0.014 75)                   /* Variante de fundo mais suave */
--muted-foreground: oklch(45% 0.015 60)          /* Texto sobre muted */

--accent: oklch(93.996% 0.01787 64.782)          /* Tom quente complementar */
--accent-foreground: oklch(22% 0.025 45)          /* Texto sobre accent */
```

#### Cores Funcionais
```css
--destructive: oklch(55% 0.22 27)                 /* Vermelho acessível */
--destructive-foreground: oklch(98% 0.005 30)     /* Texto sobre destructive */

--border: oklch(88% 0.015 80)                     /* Bordas definidas mas sutis */
--input: oklch(82% 0.012 75)                     /* Inputs */
--ring: oklch(69.18% 0.18855 38.353)             /* Anel de foco (mesmo do primary) */
```

#### Cores para Gráficos
```css
--chart-1: oklch(65% 0.18 160)                   /* Verde */
--chart-2: oklch(60% 0.2 28)                     /* Laranja/Vermelho */
--chart-3: oklch(58% 0.19 295)                   /* Roxo */
--chart-4: oklch(55% 0.2 260)                    /* Azul */
--chart-5: oklch(68% 0.16 85)                    /* Amarelo */
```

#### Sidebar
```css
--sidebar: oklch(94.637% 0.00925 62.27)          /* Elevação sutil do background */
--sidebar-foreground: oklch(20% 0.02 45)          /* Texto da sidebar */
--sidebar-primary: oklch(25% 0.025 45)            /* Item ativo da sidebar */
--sidebar-primary-foreground: oklch(98% 0.008 80) /* Texto sobre item ativo */
--sidebar-accent: oklch(88.94% 0.02161 65.18)     /* Hover da sidebar */
--sidebar-accent-foreground: oklch(22% 0.025 45)  /* Texto sobre hover */
--sidebar-border: oklch(58.814% 0.15852 38.26)    /* Borda da sidebar */
--sidebar-ring: oklch(69.18% 0.18855 38.353)      /* Anel de foco da sidebar */
```

#### Componentes Especiais
```css
--month-picker: oklch(92.929% 0.01274 63.703)     /* Seletor de mês */
--month-picker-foreground: oklch(22% 0.015 45)    /* Texto do seletor */
--dark: oklch(22% 0.015 45)                       /* Botão dark mode */
--dark-foreground: oklch(94% 0.008 80)            /* Texto do botão dark */
--welcome-banner: var(--primary)                  /* Banner de boas-vindas */
--welcome-banner-foreground: oklch(98% 0.008 80)  /* Texto do banner */
```

### Modo Escuro (Dark Mode)

#### Superfícies Base
```css
--background: oklch(14% 0.004 285)                 /* Preto verdadeiro com saturação mínima */
--foreground: oklch(95% 0.003 285)                /* Texto claro */
--card: oklch(18% 0.005 285)                      /* Card escuro */
--card-foreground: oklch(95% 0.003 285)           /* Texto sobre card */
--popover: oklch(20% 0.006 285)                   /* Popover escuro */
--popover-foreground: oklch(95% 0.003 285)        /* Texto sobre popover */
```

#### Cores Principais (Dark)
```css
--primary: oklch(69.18% 0.18855 38.353)           /* Terracota vibrante (mesmo do light) */
--primary-foreground: oklch(12% 0.008 285)        /* Texto escuro sobre primary */

--secondary: oklch(22% 0.004 285)                 /* Superfície elevada */
--secondary-foreground: oklch(93% 0.003 285)       /* Texto sobre secondary */

--muted: oklch(20% 0.004 285)                     /* Variante sutil */
--muted-foreground: oklch(60% 0.003 285)          /* Texto sobre muted */

--accent: oklch(26% 0.006 285)                    /* Destaque sutil */
--accent-foreground: oklch(95% 0.003 285)         /* Texto sobre accent */
```

#### Cores Funcionais (Dark)
```css
--destructive: oklch(62% 0.2 28)                  /* Vermelho mais claro para dark */
--destructive-foreground: oklch(98% 0.005 30)     /* Texto sobre destructive */

--border: oklch(28% 0.004 285)                     /* Bordas visíveis mas sutis */
--input: oklch(32% 0.005 285)                     /* Inputs escuros */
--ring: oklch(69.18% 0.18855 38.353)              /* Anel de foco */
```

#### Cores para Gráficos (Dark)
```css
--chart-1: oklch(72% 0.17 158)                    /* Verde mais brilhante */
--chart-2: oklch(68% 0.19 30)                     /* Laranja mais brilhante */
--chart-3: oklch(68% 0.18 298)                    /* Roxo mais brilhante */
--chart-4: oklch(65% 0.18 262)                    /* Azul mais brilhante */
--chart-5: oklch(74% 0.15 88)                     /* Amarelo mais brilhante */
```

### Conversão OKLCH para RGB/HEX

Para usar essas cores em outras aplicações, você pode converter OKLCH para RGB/HEX usando ferramentas online ou bibliotecas como:
- [OKLCH Color Picker](https://oklch.com/)
- [CSS Color Converter](https://www.w3.org/TR/css-color-4/#oklch)

**Exemplo de conversão aproximada:**
- `--primary: oklch(69.18% 0.18855 38.353)` ≈ `#D97757` ou `rgb(217, 119, 87)`

---

## 📝 Tipografia

### Fontes Principais

#### 1. Fonte Principal: **Funnel Display**
```typescript
// Google Fonts
const funnel_display = Funnel_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
```
- **Uso**: Fonte principal da aplicação
- **Pesos disponíveis**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Aplicação**: `className={main_font.className}` no body

#### 2. Fonte para Valores Monetários: **Anthropic Sans**
```typescript
// Local Font
const anthropic_sans = localFont({
  src: [
    {
      path: "../fonts/anthropic-sans.woff2",
      weight: "400",
      style: "normal",
    },
  ],
});
```
- **Uso**: Valores monetários e títulos especiais
- **Peso**: 400 (Regular)
- **Arquivo**: `/public/fonts/anthropic-sans.woff2`

#### 3. Fonte de Títulos: **Anthropic Sans**
- Mesma fonte dos valores monetários
- Usada para títulos e destaques

### Configurações de Tipografia

```css
/* Aplicado globalmente */
body {
  font-family: var(--font-funnel-display);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Tracking (espaçamento entre letras) */
--tracking-normal: 0em;
```

### Tamanhos de Fonte (Tailwind)

O sistema utiliza os tamanhos padrão do Tailwind CSS:
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px) - **Padrão para botões**
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)

### Pesos de Fonte
- `font-normal`: 400
- `font-medium`: 500 - **Padrão para botões**
- `font-semibold`: 600
- `font-bold`: 700

---

## 🎯 Ícones

### Bibliotecas Utilizadas

#### 1. **Remix Icon** (Principal)
```json
"@remixicon/react": "4.7.0"
```
- **Uso**: Ícones principais da aplicação
- **Estilo**: Outline (Line) e Fill
- **Tamanho padrão**: `h-4 w-4` (16px)
- **Configuração**: Definido em `components.json` como `iconLibrary`

**Exemplo de uso:**
```tsx
import { RiMoneyDollarCircleLine } from "@remixicon/react";

<RiMoneyDollarCircleLine className="h-4 w-4" />
```

#### 2. **Lucide React** (Secundária)
```json
"lucide-react": "0.554.0"
```
- **Uso**: Ícones auxiliares e componentes específicos
- **Estilo**: Outline minimalista
- **Tamanho padrão**: `size-4` ou `h-4 w-4`

**Exemplo de uso:**
```tsx
import { Loader2Icon, XIcon } from "lucide-react";

<Loader2Icon className="size-4" />
```

### Padrões de Ícones

#### Tamanhos Padrão
```css
const ICON_CLASS = "h-4 w-4";  /* 16px - Padrão */
```

#### Tamanhos em Botões
- Botão padrão: `size-4` (16px)
- Botão pequeno: `size-3.5` (14px)
- Botão grande: `size-5` (20px)

#### Ícones por Contexto

**Finanças:**
- `RiMoneyDollarCircleLine` - Dinheiro
- `RiWallet3Line` - Carteira
- `RiBankCardLine` - Cartão
- `RiBankLine` - Banco
- `RiLineChartLine` - Gráfico

**Pagamentos:**
- `RiPixLine` - PIX
- `RiBarcodeLine` - Boleto
- `RiBankCardLine` - Cartão de crédito/débito

**Status:**
- `RiCheckLine` - Concluído/À vista
- `RiRefreshLine` - Recorrente
- `RiLoader2Fill` - Parcelado

### Sistema de Ícones Dinâmicos

O sistema possui um utilitário para buscar ícones dinamicamente:

```typescript
// lib/utils/icons.tsx
export const getIconComponent = (
  iconName: string
): ComponentType<{ className?: string }> | null => {
  const icon = (RemixIcons as Record<string, unknown>)[iconName];
  return icon && typeof icon === "function" 
    ? icon as ComponentType<{ className?: string }> 
    : null;
};
```

---

## 📐 Espaçamento e Layout

### Sistema de Espaçamento (Tailwind)

O sistema utiliza a escala padrão do Tailwind CSS baseada em múltiplos de 4px:

```css
--spacing: 0.25rem;  /* 4px - unidade base */
```

**Escala de espaçamento:**
- `p-1` / `m-1`: 0.25rem (4px)
- `p-2` / `m-2`: 0.5rem (8px)
- `p-3` / `m-3`: 0.75rem (12px)
- `p-4` / `m-4`: 1rem (16px)
- `p-6` / `m-6`: 1.5rem (24px)
- `p-8` / `m-8`: 2rem (32px)
- `p-12` / `m-12`: 3rem (48px)
- `p-16` / `m-16`: 4rem (64px)

### Container

```css
.container {
  @apply mx-auto px-4 lg:px-0;
}
```

- **Centralização**: `mx-auto`
- **Padding mobile**: `px-4` (16px)
- **Padding desktop**: `px-0` (sem padding extra)

### Alturas Customizadas

```css
--spacing-custom-height-1: 28rem;  /* 448px */
```

### Gap (Espaçamento entre elementos)

- `gap-1`: 0.25rem (4px)
- `gap-2`: 0.5rem (8px) - **Padrão para botões**
- `gap-3`: 0.75rem (12px)
- `gap-4`: 1rem (16px)

---

## 🧩 Componentes

### Sistema de Componentes: shadcn/ui

**Estilo**: "new-york"
**Base**: Radix UI (acessibilidade nativa)
**Configuração**: `components.json`

### Botões

#### Variantes
```typescript
variant: {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  outline: "border bg-background shadow-xs hover:bg-accent",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
}
```

#### Tamanhos
```typescript
size: {
  default: "h-9 px-4 py-2",      /* 36px altura */
  sm: "h-8 px-3",                /* 32px altura */
  lg: "h-10 px-6",               /* 40px altura */
  icon: "size-9",                /* 36x36px */
  "icon-sm": "size-8",           /* 32x32px */
  "icon-lg": "size-10",          /* 40x40px */
}
```

#### Características
- **Gap entre ícone e texto**: `gap-2` (8px)
- **Hover effect**: `hover:scale-105` (escala 5%)
- **Focus ring**: `ring-[3px]` com cor `ring-ring/50`
- **Transição**: `transition-all`
- **Disabled**: `opacity-50` e `pointer-events-none`

### Campos de Formulário (Field)

#### Orientação
```typescript
orientation: {
  vertical: "flex-col *:w-full",
  horizontal: "flex-row items-center",
  responsive: "flex-col @md:flex-row",
}
```

### Cards

- **Background**: `bg-card`
- **Foreground**: `text-card-foreground`
- **Padding**: Variável conforme necessidade
- **Border radius**: `rounded-md` ou `rounded-lg`

---

## 🌑 Sombras

### Modo Claro

```css
--shadow-2xs: 0 1px 2px 0px oklch(35% 0.02 45 / 0.04);
--shadow-xs: 0 1px 3px 0px oklch(35% 0.02 45 / 0.06);
--shadow-sm: 0 1px 3px 0px oklch(35% 0.02 45 / 0.08),
             0 1px 2px -1px oklch(35% 0.02 45 / 0.08);
--shadow: 0 2px 4px 0px oklch(35% 0.02 45 / 0.08),
          0 1px 2px -1px oklch(35% 0.02 45 / 0.06);
--shadow-md: 0 4px 6px -1px oklch(35% 0.02 45 / 0.1),
             0 2px 4px -2px oklch(35% 0.02 45 / 0.08);
--shadow-lg: 0 10px 15px -3px oklch(35% 0.02 45 / 0.1),
             0 4px 6px -4px oklch(35% 0.02 45 / 0.08);
--shadow-xl: 0 20px 25px -5px oklch(35% 0.02 45 / 0.1),
             0 8px 10px -6px oklch(35% 0.02 45 / 0.08);
--shadow-2xl: 0 25px 50px -12px oklch(35% 0.02 45 / 0.2);
```

**Características:**
- Sombras com tom quente (tintadas)
- Opacidade baixa para sutileza
- Múltiplas camadas para profundidade

### Modo Escuro

```css
--shadow-2xs: 0 1px 2px 0px oklch(0% 0 0 / 0.3);
--shadow-xs: 0 1px 3px 0px oklch(0% 0 0 / 0.4);
--shadow-sm: 0 1px 3px 0px oklch(0% 0 0 / 0.45),
             0 1px 2px -1px oklch(0% 0 0 / 0.45);
--shadow: 0 2px 4px 0px oklch(0% 0 0 / 0.5),
          0 1px 2px -1px oklch(0% 0 0 / 0.4);
--shadow-md: 0 4px 6px -1px oklch(0% 0 0 / 0.55),
             0 2px 4px -2px oklch(0% 0 0 / 0.45);
--shadow-lg: 0 10px 15px -3px oklch(0% 0 0 / 0.55),
             0 4px 6px -4px oklch(0% 0 0 / 0.45);
--shadow-xl: 0 20px 25px -5px oklch(0% 0 0 / 0.6),
             0 8px 10px -6px oklch(0% 0 0 / 0.5);
--shadow-2xl: 0 25px 50px -12px oklch(0% 0 0 / 0.7);
```

**Características:**
- Sombras mais profundas e opacas
- Preto puro para contraste máximo
- Maior opacidade para visibilidade

---

## 🔄 Border Radius

### Sistema de Radius

```css
--radius: 0.8rem;  /* 12.8px - Base */
```

### Variações

```css
--radius-sm: calc(var(--radius) - 4px);   /* 8.8px */
--radius-md: calc(var(--radius) - 2px);    /* 10.8px */
--radius-lg: var(--radius);                /* 12.8px */
--radius-xl: calc(var(--radius) + 4px);    /* 16.8px */
```

### Uso em Componentes

- **Botões**: `rounded-md` (0.375rem / 6px) - Override do padrão
- **Cards**: `rounded-md` ou `rounded-lg`
- **Inputs**: `rounded-md`
- **Modais**: `rounded-lg`

---

## ✨ Animações e Transições

### Transições Padrão

```css
transition-all        /* Todas as propriedades */
transition-transform  /* Apenas transformações */
```

### Efeitos de Hover

#### Botões
```css
hover:scale-105       /* Escala 5% no hover */
transition-transform  /* Transição suave */
```

#### Links
```css
hover:underline       /* Sublinhado no hover */
underline-offset-4    /* Offset de 4px */
```

### Scroll Behavior

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px;  /* Offset para header sticky */
}
```

### Selection (Seleção de Texto)

```css
*::selection {
  background: var(--primary) / 25%;
  color: var(--foreground);
}

.dark *::selection {
  background: var(--primary) / 30%;
  color: var(--foreground);
}
```

### View Transitions

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
```

### Bibliotecas de Animação

- **Framer Motion** (`motion`): Para animações complexas
- **CSS Transitions**: Para interações simples

---

## 🌓 Dark Mode

### Implementação

**Biblioteca**: `next-themes` (v0.4.6)

```tsx
<ThemeProvider attribute="class" defaultTheme="light">
  {children}
</ThemeProvider>
```

### Toggle

- **Atributo**: `class` no elemento HTML
- **Classe**: `.dark` aplicada ao elemento raiz
- **Persistência**: Automática via `next-themes`

### Variante Dark no Tailwind

```css
@custom-variant dark (&:is(.dark *));
```

Permite usar `dark:` prefix em qualquer classe Tailwind.

### Estratégia de Cores no Dark Mode

1. **Backgrounds**: Escuros com saturação mínima
2. **Foregrounds**: Claros com alto contraste
3. **Primary**: Mantém a mesma cor vibrante
4. **Borders**: Mais visíveis mas ainda sutis
5. **Sombras**: Mais profundas e opacas

---

## 📦 Dependências Principais

```json
{
  "@remixicon/react": "4.7.0",           // Ícones principais
  "lucide-react": "0.554.0",             // Ícones auxiliares
  "next-themes": "0.4.6",                // Dark mode
  "tailwindcss": "4.1.17",               // Framework CSS
  "class-variance-authority": "0.7.1",    // Variantes de componentes
  "motion": "^12.23.24",                 // Animações
  "@radix-ui/*": "various"               // Componentes base
}
```

---

## 🎯 Guia de Uso Rápido

### Criar um Botão

```tsx
import { Button } from "@/components/ui/button";
import { RiAddLine } from "@remixicon/react";

<Button variant="default" size="default">
  <RiAddLine className="h-4 w-4" />
  Adicionar
</Button>
```

### Usar Cores

```tsx
// Tailwind classes
<div className="bg-primary text-primary-foreground">
  Conteúdo
</div>

// CSS variables
<div style={{ backgroundColor: 'var(--primary)' }}>
  Conteúdo
</div>
```

### Aplicar Sombras

```tsx
<div className="shadow-md">Card com sombra média</div>
<div className="shadow-lg">Card com sombra grande</div>
```

### Dark Mode

```tsx
// Automático via ThemeProvider
<div className="bg-background dark:bg-background">
  Conteúdo adaptativo
</div>
```

---

## 📚 Recursos Adicionais

- **shadcn/ui**: https://ui.shadcn.com/
- **Radix UI**: https://www.radix-ui.com/
- **Remix Icon**: https://remixicon.com/
- **Lucide Icons**: https://lucide.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **OKLCH Color**: https://oklch.com/
- **Funnel Display Font**: https://fonts.google.com/specimen/Funnel+Display

---

## 📝 Notas Finais

Este design system foi cuidadosamente elaborado para criar uma experiência visual coesa, moderna e acessível. As cores em OKLCH garantem melhor percepção visual e consistência entre diferentes dispositivos e condições de iluminação.

**Princípios de Design:**
1. **Consistência**: Uso sistemático de cores, espaçamentos e componentes
2. **Acessibilidade**: Contraste adequado e suporte a leitores de tela
3. **Performance**: Uso eficiente de CSS e otimização de fontes
4. **Escalabilidade**: Sistema modular e fácil de estender

---

**Última atualização**: Baseado na análise do código em dezembro de 2024
