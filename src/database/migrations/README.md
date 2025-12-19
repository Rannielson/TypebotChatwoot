# Estrutura de Migrations

Este diretório contém as migrations do banco de dados organizadas por funcionalidade.

## 📁 Estrutura de Diretórios

```
migrations/
├── core/           # Tabelas principais do sistema
│   ├── 001_create_users.ts
│   ├── 002_create_tenants.ts
│   └── 015_create_default_user.ts
│
├── inboxes/        # Tudo relacionado a inboxes
│   ├── 003_create_inboxes.ts
│   ├── 007_add_chatwoot_fields.ts
│   └── 010_add_test_mode_to_inboxes.ts
│
├── sessions/       # Sessões e histórico de conversas
│   ├── 004_create_sessions_history.ts
│   ├── 005_create_message_logs.ts
│   ├── 006_create_button_mappings.ts
│   └── 008_add_contact_name_and_paused_status.ts
│
├── triggers/       # Triggers e execuções
│   ├── 011_create_triggers_table.ts
│   ├── 012_create_trigger_executions.ts
│   ├── 013_update_trigger_executions_add_typebot_session.ts
│   └── 014_update_trigger_frequency_minimum.ts
│
└── updates/        # Atualizações gerais em tabelas existentes
    └── 009_add_openai_api_key.ts
```

## 🔢 Convenção de Numeração

- As migrations são numeradas sequencialmente (001, 002, 003, ...)
- A numeração garante a ordem de execução
- O script `migrate.ts` ordena automaticamente por número, independente do diretório

## 📝 Criando uma Nova Migration

1. Escolha o diretório apropriado baseado na funcionalidade
2. Use o próximo número sequencial disponível
3. Siga o padrão de nomenclatura: `NNN_descricao_da_migration.ts`

**Exemplo:**
```typescript
// triggers/015_add_trigger_notifications.ts
export const up = `
  -- Sua migration aqui
`;

export const down = `
  -- Rollback aqui
`;
```

## 🚀 Executando Migrations

```bash
npm run migrate
```

O script automaticamente:
- Busca migrations em todos os subdiretórios
- Ordena por número sequencial
- Executa apenas migrations não executadas
- Mantém histórico na tabela `migrations`

## 📋 Diretórios e Responsabilidades

### `core/`
Tabelas fundamentais do sistema:
- Users (autenticação)
- Tenants (multi-tenancy)
- Usuário padrão (admin@example.com / admin123)

### `inboxes/`
Configurações e dados de inboxes:
- Criação de inboxes
- Campos adicionais
- Modo de teste

### `sessions/`
Histórico e dados de sessões:
- Sessões de conversas
- Logs de mensagens
- Mapeamento de botões
- Status e informações adicionais

### `triggers/`
Sistema de triggers:
- Tabela de triggers
- Execuções de triggers
- Campos e configurações relacionadas

### `updates/`
Atualizações gerais que não se encaixam em categorias específicas:
- Adição de campos em múltiplas tabelas
- Alterações estruturais gerais

## ⚠️ Importante

- **Nunca altere** migrations já executadas em produção
- **Sempre crie** novas migrations para alterações
- **Mantenha** a numeração sequencial
- **Teste** migrations em ambiente de desenvolvimento primeiro
