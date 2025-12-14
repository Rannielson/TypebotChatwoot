# Webhook API - Documentação

## Visão Geral

O serviço **Webhook API** é um servidor dedicado e otimizado exclusivamente para receber webhooks do Chatwoot. Ele foi separado da API geral para permitir escalabilidade independente e alta performance.

## Arquitetura

```
┌─────────────────┐
│   Chatwoot      │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx   │ (Load Balancer + Rate Limiting)
    └────┬────┘
         │
    ┌────▼──────────────────────────┐
    │  Webhook API (N réplicas)      │
    │  - Apenas /webhook/*           │
    │  - Lock na criação do job      │
    │  - Resposta <50ms              │
    └────┬───────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │  BullMQ Queue (Redis)          │
    └───────────────────────────────┘
```

## Características

### 1. **Servidor Dedicado**
- Apenas rotas de webhook (`/webhook/*`) e health check
- Sem rotas administrativas (auth, tenants, etc)
- CORS simplificado (aceita de qualquer origem)
- Overhead mínimo

### 2. **Proteção contra Duplicatas**
- **Lock na criação do job**: Evita que múltiplas réplicas criem o mesmo job
- **JobId único**: Baseado em `inbox_id` + `message_id`
- **Lock no processamento**: Workers também usam lock (já implementado)

### 3. **Escalabilidade**
- Múltiplas réplicas via Docker Compose
- Load balancing via Nginx (least_conn)
- Rate limiting: 100 req/s por IP (configurável)

## Configuração

### Variáveis de Ambiente

```bash
# Porta interna do webhook-api
WEBHOOK_PORT=3001

# Número de réplicas do webhook-api
WEBHOOK_API_REPLICAS=3

# TTL do lock na criação do job (em ms, padrão: 5000ms = 5s)
WEBHOOK_JOB_CREATE_LOCK_TTL=5000

# Porta externa (via Nginx)
PORT=3000
```

### Docker Compose

```yaml
webhook-api:
  command: node dist/webhook-server.js
  environment:
    PORT: ${WEBHOOK_PORT:-3001}
    WEBHOOK_JOB_CREATE_LOCK_TTL: ${WEBHOOK_JOB_CREATE_LOCK_TTL:-5000}
  expose:
    - "${WEBHOOK_PORT:-3001}"
```

## Uso

### Iniciar Webhook API

```bash
# Usando script (recomendado)
./docker/start-webhook-api.sh

# Ou manualmente
cd docker
docker-compose up -d --scale webhook-api=3 webhook-api nginx
```

### Escalar Webhook API

```bash
# Via script (usa WEBHOOK_API_REPLICAS do .env)
export WEBHOOK_API_REPLICAS=5
./docker/start-webhook-api.sh

# Ou manualmente
cd docker
docker-compose up -d --scale webhook-api=5 webhook-api
```

### Ver Logs

```bash
# Logs de todas as réplicas
docker-compose logs -f webhook-api

# Logs de uma réplica específica
docker-compose logs -f webhook-api_1
```

### Ver Status

```bash
docker-compose ps webhook-api
```

## Nginx Load Balancer

O Nginx distribui requisições entre as réplicas do webhook-api usando `least_conn` (menor número de conexões ativas).

### Configuração

- **Rate Limiting**: 100 req/s por IP (burst: 50)
- **Health Checks**: Endpoint `/health` sem rate limit
- **Timeouts**: Otimizados para resposta rápida (<5s)

### Endpoints

- `POST /webhook/chatwoot` → Webhook API (com rate limiting)
- `GET /health` → Webhook API (sem rate limiting)
- `GET /api/*` → API Geral

## Performance Esperada

### Com 3 réplicas de Webhook API:
- **Throughput**: ~3.000 req/s (1.000 req/s por réplica)
- **Latência**: <50ms (p95)
- **Disponibilidade**: Alta (failover automático)

### Com 10 réplicas de Webhook API:
- **Throughput**: ~10.000 req/s
- **Capacidade**: ~864M requisições/dia (10M req/dia = ~116 req/s)

## Monitoramento

### Health Check

```bash
curl http://localhost:3000/health
```

### Métricas Recomendadas

1. **Taxa de requisições por segundo** (por réplica)
2. **Tempo de resposta** (p50, p95, p99)
3. **Taxa de erros** (4xx, 5xx)
4. **Uso de CPU/Memória** (por réplica)
5. **Taxa de locks adquiridos vs falhados**

## Troubleshooting

### Webhook API não está respondendo

```bash
# Verificar se está rodando
docker-compose ps webhook-api

# Verificar logs
docker-compose logs webhook-api

# Verificar conectividade Redis
docker-compose exec webhook-api node -e "require('./dist/config/redis').redis.connect().then(() => console.log('OK')).catch(e => console.error(e))"
```

### Muitas requisições sendo bloqueadas

- Aumentar `WEBHOOK_API_REPLICAS`
- Verificar rate limiting no Nginx
- Verificar se Redis está saudável

### Jobs duplicados

- Verificar se `WEBHOOK_JOB_CREATE_LOCK_TTL` está configurado
- Verificar logs de lock (deve retornar `already_queued` quando lock falha)
- Verificar se Redis Lock está funcionando

## Comparação: Antes vs Depois

### Antes (API Única)
- ❌ Webhooks e API geral no mesmo container
- ❌ Escalabilidade limitada (precisa escalar tudo junto)
- ❌ Overhead desnecessário para webhooks
- ❌ Sem proteção contra duplicatas na criação

### Depois (Webhook API Separada)
- ✅ Webhooks em container dedicado
- ✅ Escalabilidade independente (10+ réplicas de webhook, 1-2 de API)
- ✅ Overhead mínimo (apenas webhook routes)
- ✅ Lock na criação + processamento (dupla proteção)

## Próximos Passos

1. **Monitoramento**: Adicionar métricas (Prometheus/Grafana)
2. **Alertas**: Configurar alertas para alta latência/erros
3. **Auto-scaling**: Implementar auto-scaling baseado em métricas
4. **Circuit Breaker**: Adicionar circuit breaker para Redis/Queue
