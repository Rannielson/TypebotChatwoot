# 🚀 Guia Rápido de Inicialização

Este guia vai te ajudar a colocar o projeto rodando rapidamente.

## 📋 Pré-requisitos

- Node.js 20+ instalado
- Docker e Docker Compose instalados
- Git instalado

## ⚡ Início Rápido (3 passos)

### 1️⃣ Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar se necessário (valores padrão já funcionam para desenvolvimento)
# nano .env
```

### 2️⃣ Iniciar Serviços Docker

```bash
# Iniciar PostgreSQL e Redis
cd docker
docker-compose up -d postgres redis
cd ..
```

### 3️⃣ Instalar Dependências e Configurar Banco

```bash
# Instalar dependências do backend
npm install

# Executar migrations
npm run migrate

# Criar usuário admin padrão
npm run seed
```

### 4️⃣ Iniciar Aplicação

**Opção A: Iniciar tudo de uma vez (recomendado)**
```bash
npm run dev:all
```

**Opção B: Iniciar separadamente**

Terminal 1 - Backend:
```bash
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm install  # apenas na primeira vez
npm run dev
```

## 🌐 Acessar Aplicação

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 👤 Credenciais Padrão

- **Email**: `admin@example.com`
- **Senha**: `admin123`

## 📝 Scripts Úteis

```bash
# Setup completo (instala dependências, roda migrations e seeds)
npm run setup

# Iniciar backend e frontend juntos
npm run dev:all

# Docker
npm run docker:up      # Iniciar serviços Docker
npm run docker:down    # Parar serviços Docker
npm run docker:logs    # Ver logs dos serviços

# Banco de dados
npm run migrate        # Executar migrations
npm run seed          # Criar dados iniciais
```

## 🔧 Troubleshooting

### Erro: "Port already in use"
```bash
# Verificar processos nas portas
lsof -i :3000  # Backend
lsof -i :3001  # Frontend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Parar processos se necessário
kill -9 <PID>
```

### Erro: "Cannot connect to database"
```bash
# Verificar se Docker está rodando
docker ps

# Reiniciar serviços Docker
cd docker
docker-compose restart
```

### Erro: "Module not found"
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 📚 Próximos Passos

1. Acesse http://localhost:3001 e faça login
2. Crie um Tenant (empresa)
3. Configure um Inbox com suas credenciais do WhatsApp e Typebot
4. Configure o webhook no Chatwoot apontando para: `http://seu-servidor:3000/webhook/chatwoot`

## 🆘 Precisa de Ajuda?

- Verifique os logs: `npm run docker:logs`
- Verifique health check: http://localhost:3000/health/full
- Consulte o README.md principal para mais detalhes

