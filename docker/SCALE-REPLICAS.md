# Escalando Réplicas - Webhook API e Workers

## Comandos Rápidos

### Escalar Webhook API para 3 réplicas

```bash
cd docker
docker-compose up -d --scale webhook-api=3 webhook-api
```

Ou usando o script:

```bash
export WEBHOOK_API_REPLICAS=3
./start-webhook-api.sh
```

### Escalar Workers para 3 réplicas

```bash
cd docker
docker-compose up -d --scale worker=3 worker
```

Ou usando o script:

```bash
export WORKER_REPLICAS=3
./start-workers.sh
```

### Escalar ambos simultaneamente

```bash
cd docker
docker-compose up -d --scale webhook-api=3 --scale worker=3 webhook-api worker
```

## Verificar Réplicas

### Ver status de todas as réplicas

```bash
# Webhook API
docker ps --filter "name=webhook-api"

# Workers
docker ps --filter "name=worker"
```

### Ver logs de todas as réplicas

```bash
# Webhook API
docker-compose logs -f webhook-api

# Workers
docker-compose logs -f worker
```

### Ver logs de uma réplica específica

```bash
# Webhook API réplica 2
docker logs docker-webhook-api-2 -f

# Worker réplica 2
docker logs docker-worker-2 -f
```

## Verificar Load Balancing

### Verificar DNS do Docker (múltiplos IPs)

```bash
docker-compose exec nginx nslookup webhook-api
```

Deve mostrar múltiplos endereços IP (um para cada réplica).

### Testar distribuição de carga

```bash
# Fazer várias requisições e verificar logs
for i in {1..10}; do
  curl -X POST http://localhost:3000/webhook/chatwoot \
    -H "Content-Type: application/json" \
    -d '{"test":true}' 2>&1 | grep -v "Total"
  sleep 0.5
done

# Ver logs para verificar distribuição
docker-compose logs webhook-api | grep "WebhookAPI"
```

## Configuração Atual

### Webhook API
- **Réplicas**: 3
- **Porta interna**: 3001
- **Porta externa**: 3000 (via Nginx)
- **Concurrency**: Configurável via `WEBHOOK_WORKER_CONCURRENCY` (padrão: 50)

### Workers
- **Réplicas**: 3
- **Concurrency por worker**: 
  - Webhook: 50 (configurável via `WEBHOOK_WORKER_CONCURRENCY`)
  - Log: 20 (configurável via `LOG_WORKER_CONCURRENCY`)
  - Chatwoot Note: 20 (configurável via `CHATWOOT_NOTE_WORKER_CONCURRENCY`)

### Capacidade Total

Com 3 réplicas de cada:

**Webhook API:**
- ~3.000 req/s (1.000 req/s por réplica)
- ~259M requisições/dia

**Workers:**
- 150 jobs simultâneos (50 × 3 workers)
- ~12.960.000 jobs/dia (150 × 60 × 60 × 24)

## Reduzir Réplicas

```bash
# Reduzir para 1 réplica
docker-compose up -d --scale webhook-api=1 --scale worker=1 webhook-api worker
```

## Troubleshooting

### Réplicas não estão iniciando

```bash
# Ver logs de erro
docker-compose logs webhook-api
docker-compose logs worker

# Verificar recursos do sistema
docker stats --no-stream
```

### Nginx não está distribuindo carga

```bash
# Verificar configuração do nginx
docker-compose exec nginx nginx -t

# Verificar DNS
docker-compose exec nginx nslookup webhook-api

# Reiniciar nginx
docker-compose restart nginx
```

### Verificar se todas as réplicas estão processando

```bash
# Ver logs de todas as réplicas
docker-compose logs webhook-api | grep "WebhookAPI"
docker-compose logs worker | grep "Worker"
```

## Monitoramento

### Ver uso de recursos

```bash
docker stats --filter "name=webhook-api" --filter "name=worker"
```

### Ver número de conexões ativas

```bash
# Webhook API
docker-compose exec nginx netstat -an | grep :3001 | wc -l

# Workers (via Redis/BullMQ dashboard se configurado)
```

## Próximos Passos

1. **Monitoramento**: Configurar Prometheus/Grafana para métricas
2. **Auto-scaling**: Implementar auto-scaling baseado em métricas
3. **Health Checks**: Adicionar health checks mais robustos
4. **Circuit Breaker**: Implementar circuit breaker para resiliência
