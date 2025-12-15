# Conector Multi-Tenant Chatwoot-Typebot-WhatsApp

Conector SaaS multi-tenant que integra Chatwoot, Typebot e Meta WhatsApp API para criação de chatbots inteligentes.

## Arquitetura

- **PostgreSQL**: Armazena configurações de tenants, inboxes e histórico de sessões
- **Redis**: Cache de sessões ativas (TTL 24h)
- **Node.js/TypeScript**: Aplicação principal com Express
- **Docker Compose**: Orquestração de todos os serviços

## Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento local)

## Instalação

1. Clone o repositório
2. Copie `.env.example` para `.env` e configure as variáveis
3. Execute com Docker Compose:

```bash
cd docker
docker-compose up -d
```

## Configuração

### Variáveis de Ambiente

Edite o arquivo `.env`:

```env
NODE_ENV=production
PORT=3000

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=typebot_connector
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

CHATWOOT_DEFAULT_URL=https://chatconnect.cleoia.com.br
CHATWOOT_DEFAULT_TOKEN=
# Nota: O account_id deve ser configurado por tenant via API
```

### Migrations e Seeds

Execute as migrations e seeds:

```bash
npm run migrate
npm run seed
```

Isso criará:
- Tabelas do banco de dados
- Usuário admin padrão (email: `admin@example.com`, senha: `admin123`)

## Uso

### 1. Autenticação

```bash
# Registrar novo usuário
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "senha123"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "senha123"
}
# Retorna: { "token": "...", "user": {...} }
```

### 2. Criar Tenant

```bash
POST /api/tenants
Authorization: Bearer {token}
{
  "name": "Minha Empresa",
  "chatwoot_url": "https://chatconnect.cleoia.com.br",
  "chatwoot_token": "token_opcional",
  "chatwoot_account_id": 41
}
```

**Nota:** O `chatwoot_account_id` é necessário para criar notas privadas no Chatwoot. Pode ser configurado também via variável de ambiente `CHATWOOT_DEFAULT_ACCOUNT_ID`.

### 3. Criar Inbox

```bash
POST /api/inboxes
Authorization: Bearer {token}
{
  "tenant_id": 1,
  "inbox_id": 290,
  "inbox_name": "2121 - WR",
  "whatsapp_phone_number_id": "seu_phone_number_id",
  "whatsapp_access_token": "seu_access_token",
  "whatsapp_api_version": "v21.0",
  "typebot_base_url": "https://assistenteatomos.cleoia.com.br",
  "typebot_api_key": "opcional",
  "typebot_public_id": "meu-typebot-zyyctxt",
  "chatwoot_api_token": "token_para_criar_notas_privadas",
  "is_active": true
}
```

**📖 Para explicação detalhada de cada campo, consulte:** [CONFIGURACAO-INBOXES.md](./CONFIGURACAO-INBOXES.md)

### 4. Configurar Webhook no Chatwoot

**🔗 URL do Webhook (copie e cole no Chatwoot):**

```
https://connectwebhook.atomos.tech/webhook/chatwoot
```

**Como configurar:**
1. Acesse Chatwoot → **Settings** → **Applications** → **Webhooks**
2. Clique em **Add Webhook**
3. Cole a URL acima no campo **Webhook URL**
4. Selecione os eventos:
   - ✅ `automation_event.message_created`: Processa mensagens
   - ✅ `automation_event.conversation_updated`: Encerra sessões quando `status: "resolved"`
5. Salve a configuração

**📖 Para mais detalhes, consulte:** [CONFIGURACAO-INBOXES.md](./CONFIGURACAO-INBOXES.md)

## Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter usuário atual

### Tenants
- `GET /api/tenants` - Listar tenants
- `POST /api/tenants` - Criar tenant
- `GET /api/tenants/:id` - Obter tenant
- `PUT /api/tenants/:id` - Atualizar tenant
- `DELETE /api/tenants/:id` - Deletar tenant

### Inboxes
- `GET /api/inboxes?tenant_id=1` - Listar inboxes
- `POST /api/inboxes` - Criar inbox
- `GET /api/inboxes/:id` - Obter inbox
- `PUT /api/inboxes/:id` - Atualizar inbox
- `DELETE /api/inboxes/:id` - Deletar inbox

### Webhooks
- `POST /webhook/chatwoot` - Webhook do Chatwoot (sem autenticação)

### Health Checks
- `GET /health` - Status da aplicação
- `GET /health/db` - Status do PostgreSQL
- `GET /health/redis` - Status do Redis
- `GET /health/full` - Status completo

## Fluxo de Funcionamento

1. Usuário envia mensagem no WhatsApp
2. Chatwoot recebe e envia webhook para `/webhook/chatwoot`
3. Conector normaliza payload e busca configuração do inbox
4. Busca/cria sessão no Redis
5. Chama Typebot API (`startChat` ou `continueChat`)
6. Armazena sessão no Redis (TTL 24h) e histórico no PostgreSQL
7. Transforma resposta Typebot → WhatsApp
8. Envia mensagens via Meta API
9. **Cria nota privada no Chatwoot** (registra mensagem enviada)
10. Loga tudo no PostgreSQL

**Nota:** O conector cria notas privadas no Chatwoot para cada mensagem enviada via WhatsApp, já que o Chatwoot não "escuta" mensagens externas vindas diretamente da API Meta.

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Desenvolvimento com hot reload
npm run dev

# Build
npm run build

# Executar migrations
npm run migrate

# Executar seeds
npm run seed
```

## Estrutura do Projeto

```
src/
├── config/          # Configurações (DB, Redis, env)
├── database/        # Migrations e seeds
├── models/          # Modelos do banco
├── services/         # Lógica de negócio
├── clients/         # Clientes de API (Typebot, WhatsApp)
├── handlers/        # Handlers de mensagens
├── routes/          # Rotas Express
├── middleware/      # Middlewares
├── normalizers/     # Normalização de webhooks
├── transformers/    # Transformação de dados
├── types/           # Tipos TypeScript
└── utils/           # Utilitários
```

## Segurança

- Senhas hasheadas com bcrypt
- JWT com expiração configurável
- Validação de inputs
- Webhooks sem autenticação (configurável)

## Troubleshooting

- Verifique logs: `docker-compose logs -f app`
- Verifique health checks: `GET /health/full`
- Verifique conexões: PostgreSQL e Redis devem estar saudáveis

## Licença

MIT

