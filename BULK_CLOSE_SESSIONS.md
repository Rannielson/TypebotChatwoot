# 📦 Encerramento em Massa Automático de Sessões

## ✅ Status da Implementação

- ✅ Migration criada e executada (`012_add_auto_close_bulk_interval`)
- ✅ Campo `auto_close_bulk_interval_hours` adicionado na tabela `inboxes`
- ✅ SessionBulkCloseService implementado
- ✅ SessionBulkCloseScheduler integrado ao trigger-scheduler
- ✅ Rotas da API atualizadas para suportar configuração
- ✅ Scheduler rodando e pronto para agendar jobs conforme configuração

## 📋 Como Funciona

O sistema verifica automaticamente os inboxes configurados e cria jobs cron baseados nos intervalos configurados. Quando o intervalo é atingido, executa encerramento em massa de sessões antigas.

### Características

- ✅ **Agrupamento por intervalo**: Inboxes com o mesmo intervalo compartilham o mesmo job cron (otimizado)
- ✅ **Baseado em `created_at`**: Considera a idade da sessão desde a criação
- ✅ **Encerramento em massa**: Encerra todas as sessões criadas há mais tempo que o intervalo configurado
- ✅ **Sincronização automática**: Verifica mudanças a cada 5 minutos e atualiza jobs automaticamente

## 🔧 Configuração via API

### 1. Configurar Intervalo de Encerramento em Massa

```bash
PUT /api/inboxes/:id
Authorization: Bearer <seu_token>
Content-Type: application/json

{
  "auto_close_bulk_interval_hours": 2  // Verifica e encerra a cada 2 horas
}
```

**Exemplo com curl:**

```bash
curl -X PUT http://localhost:3000/api/inboxes/1 \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_close_bulk_interval_hours": 2
  }'
```

### 2. Desabilitar Encerramento em Massa

```bash
PUT /api/inboxes/:id
Authorization: Bearer <seu_token>
Content-Type: application/json

{
  "auto_close_bulk_interval_hours": null
}
```

### 3. Verificar Configuração Atual

```bash
GET /api/inboxes/:id
Authorization: Bearer <seu_token>
```

A resposta incluirá o campo `auto_close_bulk_interval_hours`:

```json
{
  "id": 1,
  "inbox_name": "Meu Inbox",
  "auto_close_bulk_interval_hours": 2,
  ...
}
```

## 📊 Intervalos Suportados

| Intervalo | Descrição | Cron Expression |
|-----------|-----------|-----------------|
| 1 hora | Verifica a cada hora | `0 * * * *` |
| 2 horas | Verifica a cada 2 horas | `0 */2 * * *` |
| 6 horas | Verifica a cada 6 horas | `0 */6 * * *` |
| 12 horas | Verifica a cada 12 horas | `0 */12 * * *` |
| 24 horas | Verifica diariamente | `0 0 * * *` |
| 48 horas | Verifica a cada 2 dias | `0 0 */2 * *` |

## 🔍 Monitoramento

### Logs do Scheduler

Os logs do scheduler mostram quando jobs são criados e quando encerramentos são executados:

```bash
docker-compose logs -f trigger-scheduler | grep "SessionBulkClose"
```

### Exemplo de Logs

**Quando configura um intervalo:**
```
[SessionBulkCloseScheduler] ➕ Adicionado: Intervalo 2h (1 inbox(es))
[SessionBulkCloseScheduler] ✅ Intervalo 2h agendado: 1 inbox(es) (0 */2 * * *)
```

**Quando executa encerramento:**
```
[SessionBulkCloseScheduler] ⏰ EXECUTANDO: Intervalo 2h - 1 inbox(es) (IDs: 1)
[SessionBulkCloseService] ✅ Encerramento em massa concluído para inbox 1: 5 sessões encerradas, 5 chaves removidas do Redis
[SessionBulkCloseScheduler] ✅ CONCLUÍDO: Intervalo 2h - 5 sessões encerradas, 5 chaves removidas do Redis, Duração: 234ms
```

## ⚙️ Detalhes Técnicos

### Arquivos Criados/Modificados

1. **Migration**: `src/database/migrations/inboxes/012_add_auto_close_bulk_interval.ts`
2. **Model**: `src/models/inbox.model.ts` (adicionado campo `auto_close_bulk_interval_hours`)
3. **Service**: `src/services/session-bulk-close.service.ts` (novo)
4. **Scheduler**: `src/schedulers/session-bulk-close.scheduler.ts` (novo)
5. **Integração**: `src/trigger-scheduler.ts` (integração do scheduler)
6. **Rotas**: `src/routes/inbox.routes.ts` (suporte ao campo)

### Fluxo de Execução

1. **Scheduler** verifica inboxes a cada 5 minutos
2. Agrupa inboxes por **intervalo** (otimização)
3. Cria/atualiza **jobs cron** para cada intervalo único
4. Quando o intervalo é atingido, executa **encerramento em massa**
5. Encerra sessões criadas há mais tempo que o intervalo configurado
6. Remove do **Redis** automaticamente
7. Registra logs detalhados

## 🔄 Diferença entre os Recursos

| Recurso | Campo | Baseado em | Quando executa | Propósito |
|---------|-------|------------|----------------|-----------|
| **Auto-Close (inativo)** | `auto_close_minutes` | `updated_at` | A cada 1 minuto | Encerra sessões inativas |
| **Bulk-Close (automático)** | `auto_close_bulk_interval_hours` | `created_at` | Conforme intervalo | Encerra sessões antigas em massa |

### Quando Usar Cada Um

- **Auto-Close (`auto_close_minutes`)**: Use quando quiser encerrar sessões que não têm atividade há X minutos
- **Bulk-Close (`auto_close_bulk_interval_hours`)**: Use quando quiser fazer limpeza periódica de sessões antigas, independente da última atividade

## 📝 Exemplo Completo

```bash
# 1. Listar inboxes
curl http://localhost:3000/api/inboxes \
  -H "Authorization: Bearer seu_token"

# 2. Configurar encerramento em massa a cada 2 horas
curl -X PUT http://localhost:3000/api/inboxes/1 \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{"auto_close_bulk_interval_hours": 2}'

# 3. Verificar configuração
curl http://localhost:3000/api/inboxes/1 \
  -H "Authorization: Bearer seu_token"

# 4. Monitorar logs
docker-compose logs -f trigger-scheduler | grep "SessionBulkClose"
```

## 🚨 Importante

- ⚠️ O encerramento é **irreversível** (sessões fechadas não podem ser reabertas automaticamente)
- ⚠️ Use intervalos adequados para seu tipo de negócio
- ⚠️ Sessões muito antigas podem ser encerradas imediatamente após configurar
- ✅ O sistema é **otimizado** e agrupa inboxes por intervalo para melhor performance
- ✅ Sincronização automática detecta mudanças e atualiza jobs sem reiniciar

## 📊 Status Atual

Para verificar o status do scheduler:

```bash
docker-compose logs trigger-scheduler | grep "Session Bulk-Close"
```

Você verá:
- Quantos intervalos estão agendados
- Quantos inboxes estão configurados para cada intervalo
- Quando os próximos encerramentos serão executados

---

**Status**: ✅ Implementação completa e funcional
**Última atualização**: 30/12/2025
