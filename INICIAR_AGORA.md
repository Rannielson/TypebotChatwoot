# 🚀 INICIAR AGORA - Passo a Passo

## ✅ O que já está pronto:

1. ✅ Backend configurado
2. ✅ Banco de dados migrado
3. ✅ Usuário admin criado
4. ✅ Docker (PostgreSQL e Redis) rodando
5. ✅ Arquivo .env configurado

## ⚠️ O que você precisa fazer:

### 1. Instalar dependências do Frontend

```bash
cd frontend
npm install
```

**Se der erro de permissão**, tente:
```bash
npm cache clean --force
npm install
```

**Ou use yarn:**
```bash
yarn install
```

### 2. Iniciar os Serviços

**Opção A - Terminal único (recomendado):**
```bash
# Na raiz do projeto
npm run dev:all
```

**Opção B - Dois terminais:**

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

## 🌐 Acessar

- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000

## 👤 Login

- Email: `admin@example.com`
- Senha: `admin123`

---

**Pronto! Agora é só testar! 🎉**

