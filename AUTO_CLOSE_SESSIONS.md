# 🔄 Encerramento Automático de Sessões por Inbox

## ✅ Status da Implementação

- ✅ Migration criada e executada (`011_add_auto_close_minutes`)
- ✅ Campo `auto_close_minutes` adicionado na tabela `inboxes`
- ✅ SessionAutoCloseService implementado
- ✅ SessionAutoCloseScheduler integrado ao trigger-scheduler
- ✅ Rotas da API atualizadas para suportar configuração
- ✅ Scheduler rodando automaticamente a cada 1 minuto

## 📋 Como Funciona

O sistema verifica automaticamente a cada **1 minuto** se há sessões expiradas baseado no campo `updated_at` (última atividade). Se uma sessão não foi atualizada há mais tempo que o configurado em `auto_close_minutes`, ela será automaticamente encerrada.

### Critérios de Encerramento

- ✅ Baseado em `updated_at` (última atividade/interação)
- ✅ Aplica apenas para sessões com status `active` ou `paused`
- ✅ Remove automaticamente do Redis após encerrar
- ✅ Marca como `closed` no banco de dados

## 🔧 Configuração via API

### 1. Listar Inboxes

```bash
GET /api/inboxes
Authorization: Bearer <seu_token>
```

### 2. Configurar Auto-Close em um Inbox

```bash
PUT /api/inboxes/:id
Authorization: Bearer <seu_token>
Content-Type: application/json

{
  "auto_close_minutes": 30  // Encerra após 30 minutos de inatividade
}
```

**Exemplo com curl:**

```bash
curl -X PUT http://localhost:3000/api/inboxes/1 \
  -H "Authorization: Bearer seu_token_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "auto_close_minutes": 30
  }'
```

### 3. Desabilitar Auto-Close

```bash
PUT /api/inboxes/:id
Authorization: Bearer <seu_token>
Content-Type: application/json

{
  "auto_close_minutes": null
}
```

### 4. Verificar Configuração Atual

```bash
GET /api/inboxes/:id
Authorization: Bearer <seu_token>
```

A resposta incluirá o campo `auto_close_minutes`:

```json
{
  "id": 1,
  "inbox_name": "Meu Inbox",
  "auto_close_minutes": 30,
  ...
}
```

## 📊 Valores Recomendados

| Cenário | Tempo (minutos) | Descrição |
|---------|----------------|-----------|
| Conversas rápidas | 15-30 | Para atendimentos rápidos e diretos |
| Conversas normais | 60-120 | Para conversas padrão |
| Conversas longas | 240-480 | Para conversas que podem durar horas |
| Desabilitado | `null` | Não encerra automaticamente |

## 🔍 Monitoramento

### Logs do Scheduler

Os logs do scheduler mostram quando sessões são encerradas:

```bash
docker-compose logs -f trigger-scheduler | grep "SessionAutoClose"
```

### Exemplo de Log

```
[SessionAutoCloseScheduler] ✅ Verificação concluída: 
  2 inboxes processados, 
  5 sessões encerradas, 
  5 chaves removidas do Redis, 
  Duração: 234ms

[SessionAutoCloseScheduler]    • Inbox 1 (Atendimento): 3 sessão(ões) encerrada(s)
[SessionAutoCloseScheduler]    • Inbox 2 (Suporte): 2 sessão(ões) encerrada(s)
```

## ⚙️ Detalhes Técnicos

### Arquivos Criados/Modificados

1. **Migration**: `src/database/migrations/inboxes/011_add_auto_close_minutes.ts`
2. **Model**: `src/models/inbox.model.ts` (adicionado campo `auto_close_minutes`)
3. **Model**: `src/models/session.model.ts` (adicionado método `findExpiredByUpdatedAt`)
4. **Service**: `src/services/session-auto-close.service.ts` (novo)
5. **Scheduler**: `src/schedulers/session-auto-close.scheduler.ts` (novo)
6. **Integração**: `src/trigger-scheduler.ts` (integração do scheduler)
7. **Rotas**: `src/routes/inbox.routes.ts` (suporte ao campo)

### Fluxo de Execução

1. **Scheduler** roda a cada 1 minuto
2. Busca todos os **inboxes ativos** com `auto_close_minutes` configurado
3. Para cada inbox, busca **sessões expiradas** (`updated_at < NOW() - INTERVAL 'X minutes'`)
4. Encerra sessões encontradas (marca como `closed` no banco)
5. Remove do **Redis** automaticamente
6. Registra logs detalhados

## 🚨 Importante

- ⚠️ O encerramento é **irreversível** (sessões fechadas não podem ser reabertas automaticamente)
- ⚠️ Use valores adequados para seu tipo de negócio
- ⚠️ Sessões muito antigas podem ser encerradas imediatamente após configurar
- ✅ O sistema é **seguro** e não encerra sessões que estão ativas

## 📝 Exemplo Completo

```bash
# 1. Listar inboxes
curl http://localhost:3000/api/inboxes \
  -H "Authorization: Bearer seu_token"

# 2. Configurar auto-close para 30 minutos
curl -X PUT http://localhost:3000/api/inboxes/1 \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{"auto_close_minutes": 30}'

# 3. Verificar configuração
curl http://localhost:3000/api/inboxes/1 \
  -H "Authorization: Bearer seu_token"

# 4. Monitorar logs
docker-compose logs -f trigger-scheduler
```

---

**Status**: ✅ Implementação completa e funcional
**Última atualização**: 30/12/2025

