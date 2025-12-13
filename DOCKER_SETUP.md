# 🐳 Setup com Docker Compose

Agora o projeto está completamente containerizado! Você pode rodar tudo com Docker Compose.

## 🚀 Iniciar Tudo com Docker

### 1. Configurar Variáveis de Ambiente

Certifique-se de que o arquivo `.env` na raiz do projeto está configurado:

```env
NODE_ENV=production
PORT=3000
FRONTEND_PORT=3001

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=typebot_connector
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your-secret-key-change-in-production-123456789
JWT_EXPIRES_IN=24h

CHATWOOT_DEFAULT_URL=https://chatconnect.cleoia.com.br
CHATWOOT_DEFAULT_TOKEN=

FRONTEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

**Importante**: Para desenvolvimento local, use `http://localhost:3000/api` no `NEXT_PUBLIC_API_URL`.  
Para produção, ajuste conforme necessário.

### 2. Iniciar Todos os Serviços

```bash
cd docker
docker-compose up -d
```

Isso vai iniciar:
- ✅ PostgreSQL (porta 5432)
- ✅ Redis (porta 6379)
- ✅ Backend API (porta 3000)
- ✅ Frontend Next.js (porta 3001)

### 3. Executar Migrations e Seeds

```bash
# Executar migrations
docker-compose exec app npm run migrate

# Criar usuário admin
docker-compose exec app npm run seed
```

### 4. Acessar a Aplicação

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📋 Comandos Úteis

### Ver Logs

```bash
# Todos os serviços
docker-compose logs -f

# Apenas backend
docker-compose logs -f app

# Apenas frontend
docker-compose logs -f frontend

# Apenas banco de dados
docker-compose logs -f postgres
```

### Parar Serviços

```bash
docker-compose down
```

### Parar e Remover Volumes (⚠️ apaga dados)

```bash
docker-compose down -v
```

### Rebuild após Mudanças

```bash
# Rebuild apenas backend
docker-compose build app

# Rebuild apenas frontend
docker-compose build frontend

# Rebuild tudo
docker-compose build

# Rebuild e reiniciar
docker-compose up -d --build
```

### Executar Comandos no Container

```bash
# Backend
docker-compose exec app npm run migrate
docker-compose exec app npm run seed

# Frontend
docker-compose exec frontend npm run build
```

## 🔧 Troubleshooting

### Porta já em uso

Se as portas 3000 ou 3001 estiverem em uso:

```bash
# Verificar processos
lsof -i :3000
lsof -i :3001

# Ou altere no .env
PORT=3002
FRONTEND_PORT=3003
```

### Frontend não conecta ao backend

Verifique se o `NEXT_PUBLIC_API_URL` está correto:
- **Docker**: `http://app:3000/api` (nome do serviço)
- **Desenvolvimento local**: `http://localhost:3000/api`

### Rebuild necessário após mudanças

Se você fez mudanças no código:

```bash
docker-compose up -d --build
```

### Verificar saúde dos serviços

```bash
# Health check do backend
curl http://localhost:3000/health/full

# Verificar containers rodando
docker-compose ps
```

## 📦 Estrutura dos Containers

```
┌─────────────────┐
│   Frontend      │  Porta 3001
│   (Next.js)     │
└────────┬────────┘
         │
         │ HTTP
         │
┌────────▼────────┐
│   Backend       │  Porta 3000
│   (Express)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼───┐
│Postgres│ │Redis │
│ 5432  │ │ 6379 │
└───────┘ └──────┘
```

## 🎯 Desenvolvimento vs Produção

### Desenvolvimento Local (sem Docker)

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Produção (com Docker)

```bash
cd docker
docker-compose up -d
```

## ✅ Checklist

- [ ] Arquivo `.env` configurado
- [ ] Docker e Docker Compose instalados
- [ ] `docker-compose up -d` executado
- [ ] Migrations executadas
- [ ] Seeds executados
- [ ] Frontend acessível em http://localhost:3001
- [ ] Backend acessível em http://localhost:3000

---

**Agora tudo está containerizado e pronto para rodar! 🎉**

