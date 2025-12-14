# 🚀 Configuração de Workers

## Visão Geral

Os workers são containers separados que processam jobs das filas BullMQ. Similar ao n8n, você pode configurar:

1. **Concurrency**: Quantos jobs cada worker processa em paralelo
2. **Réplicas**: Quantos containers de worker rodar simultaneamente

## Configuração via Variáveis de Ambiente

### No arquivo `.env`:

```env
# Número de réplicas de workers (quantos containers)
WORKER_REPLICAS=2

# Concurrency de cada worker (quantos jobs processa em paralelo)
WEBHOOK_WORKER_CONCURRENCY=50    # Jobs de webhook por worker
LOG_WORKER_CONCURRENCY=20        # Jobs de log por worker
CHATWOOT_NOTE_WORKER_CONCURRENCY=20  # Jobs de nota por worker

# TTL do lock para evitar reprocessamento (em ms)
WEBHOOK_LOCK_TTL=60000  # 60 segundos (tempo máximo de processamento)
```

## Como Iniciar

### Opção 1: Usando o script helper

```bash
cd docker
./start-workers.sh
```

### Opção 2: Usando docker-compose diretamente

```bash
cd docker

# Iniciar 2 réplicas (padrão)
docker-compose up -d --scale worker=2 worker

# Iniciar 5 réplicas
docker-compose up -d --scale worker=5 worker

# Iniciar com variáveis customizadas
WORKER_REPLICAS=3 WEBHOOK_WORKER_CONCURRENCY=100 docker-compose up -d --scale worker=3 worker
```

## Cálculo de Capacidade

**Throughput total = Réplicas × Concurrency × Workers por réplica**

Exemplo:
- 2 réplicas de workers
- 50 concurrency por worker (webhook)
- **Total: 2 × 50 = 100 jobs simultâneos de webhook**

## Monitoramento

Para ver logs dos workers:

```bash
# Todos os workers
docker-compose logs -f worker

# Worker específico (se tiver nome)
docker-compose logs -f worker_1
```

## Escalabilidade

Para aumentar capacidade:

1. **Aumentar réplicas** (mais containers):
   ```bash
   docker-compose up -d --scale worker=5 worker
   ```

2. **Aumentar concurrency** (mais jobs por container):
   ```env
   WEBHOOK_WORKER_CONCURRENCY=100
   ```

⚠️ **Atenção**: Aumentar muito a concurrency pode sobrecarregar o sistema. Teste gradualmente.

## Exemplo de Configuração para 10M req/dia

```env
# 5 réplicas de workers
WORKER_REPLICAS=5

# 100 jobs simultâneos por worker
WEBHOOK_WORKER_CONCURRENCY=100
LOG_WORKER_CONCURRENCY=50
CHATWOOT_NOTE_WORKER_CONCURRENCY=50
```

**Capacidade total**: 5 × 100 = **500 jobs simultâneos de webhook**

## 🔒 Proteção contra Reprocessamento (Redis Lock)

O sistema usa **Redis Lock** (Redlock) para garantir que um job não seja processado por múltiplos workers simultaneamente.

### Como Funciona

1. **JobId único**: Cada webhook recebe um `jobId` único baseado em `inbox_id + message_id`
2. **Lock antes de processar**: Worker tenta adquirir lock antes de processar
3. **Se lock não disponível**: Job é pulado (outro worker já está processando)
4. **Lock expira automaticamente**: TTL configurável (padrão: 60s)

### Configuração

```env
# TTL do lock em milissegundos (padrão: 60000 = 60s)
WEBHOOK_LOCK_TTL=60000
```

### Benefícios

- ✅ **Evita duplicatas**: Mesmo webhook não é processado duas vezes
- ✅ **Proteção distribuída**: Funciona com múltiplos workers
- ✅ **Auto-expiração**: Lock expira automaticamente se worker travar
- ✅ **Idempotência**: Jobs podem ser reprocessados com segurança
