# ✅ Setup Completo - Pronto para Testar!

## 🎉 Status da Configuração

✅ **Backend configurado e pronto**
- Dependências instaladas
- Migrations executadas
- Usuário admin criado
- Banco de dados conectado

✅ **Docker configurado**
- PostgreSQL rodando na porta 5432
- Redis rodando na porta 6379

✅ **Arquivos de configuração criados**
- `.env` criado na raiz
- `frontend/.env.local` criado

⚠️ **Frontend - Ação necessária**
- Há um problema de permissão no cache do npm
- Execute manualmente: `cd frontend && npm install`

## 🚀 Como Iniciar Agora

### Opção 1: Iniciar Backend e Frontend Separadamente

**Terminal 1 - Backend:**
```bash
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install  # Se ainda não instalou
npm run dev
```

### Opção 2: Usar o Script Automático

```bash
npm run dev:all
```

## 🌐 URLs de Acesso

Após iniciar os serviços:

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Webhook Chatwoot**: http://localhost:3000/webhook/chatwoot

## 👤 Credenciais de Login

- **Email**: `admin@example.com`
- **Senha**: `admin123`

⚠️ **Importante**: Altere a senha após o primeiro login!

## 🔧 Solução para Problema do Frontend

Se o `npm install` do frontend falhar com erro de permissão:

```bash
# Limpar cache do npm
npm cache clean --force

# Ou instalar com yarn (alternativa)
cd frontend
yarn install
```

## 📝 Próximos Passos para Testar

1. **Acesse o frontend**: http://localhost:3001
2. **Faça login** com as credenciais acima
3. **Crie um Tenant** (empresa)
4. **Configure um Inbox** com:
   - Credenciais do WhatsApp (Meta API)
   - URL e Public ID do Typebot
   - Token da API do Chatwoot (opcional)
5. **Configure o webhook no Chatwoot** apontando para:
   ```
   http://seu-servidor:3000/webhook/chatwoot
   ```

## 🆘 Comandos Úteis

```bash
# Ver logs do Docker
npm run docker:logs

# Parar serviços Docker
npm run docker:down

# Iniciar serviços Docker
npm run docker:up

# Verificar saúde do sistema
curl http://localhost:3000/health/full
```

## ✅ Checklist de Teste

- [ ] Backend iniciado e respondendo em http://localhost:3000
- [ ] Frontend iniciado e respondendo em http://localhost:3001
- [ ] Login funcionando com admin@example.com
- [ ] Dashboard carregando estatísticas
- [ ] Criação de Tenant funcionando
- [ ] Criação de Inbox funcionando
- [ ] Webhook do Chatwoot configurado e testado

## 📚 Documentação

- **Guia Rápido**: Veja `QUICK_START.md`
- **README Principal**: Veja `README.md`
- **Design System**: Veja `DESIGN_SYSTEM.md`

---

**Tudo pronto para começar os testes! 🚀**

