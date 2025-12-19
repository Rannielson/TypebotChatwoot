# 🐳 Publicação no Docker Hub

Este guia explica como fazer build e publicar as imagens Docker no Docker Hub.

## 📋 Pré-requisitos

1. **Conta no Docker Hub**: Crie em [hub.docker.com](https://hub.docker.com)
2. **Docker Buildx**: Para builds multi-platform (já vem com Docker Desktop)
3. **Login no Docker Hub**: `docker login`

## 🏗️ Estrutura das Imagens

O projeto usa **2 imagens**:

1. **Backend** (`conectortypebot-backend`)
   - Contém: API, Webhook API e Workers
   - Comandos diferentes para cada serviço:
     - `node dist/index.js` (API)
     - `node dist/webhook-server.js` (Webhook)
     - `node dist/workers/index.js` (Workers)

2. **Frontend** (`conectortypebot-frontend`)
   - Next.js standalone build
   - Pronto para produção

## ⚠️ IMPORTANTE: Build para Linux AMD64

**Se você está no macOS (Apple Silicon ou Intel)**, as imagens devem ser buildadas para **Linux AMD64** para funcionar corretamente em servidores Linux.

O script `build-and-push.sh` já está configurado para isso usando `--platform linux/amd64`.

## 🚀 Como Publicar

### 1. Login no Docker Hub

```bash
docker login
# Digite seu username e password
```

### 2. Configurar Variáveis (Opcional)

```bash
# Username do Docker Hub (padrão: rannielson)
export DOCKER_USERNAME=seu_usuario

# Versão da imagem (padrão: latest)
export VERSION=1.0.0
```

### 3. Executar Build e Push

```bash
# Build e push das imagens
./docker/build-and-push.sh
```

O script irá:
1. ✅ Verificar se você está logado
2. ✅ Configurar Docker Buildx para multi-platform
3. ✅ Buildar backend para Linux AMD64
4. ✅ Buildar frontend para Linux AMD64
5. ✅ Fazer push para Docker Hub

### 4. Verificar no Docker Hub

Acesse: `https://hub.docker.com/r/rannielson/conectortypebot-backend`
Acesse: `https://hub.docker.com/r/rannielson/conectortypebot-frontend`

## 📦 Usar Imagens do Docker Hub

### Atualizar docker-compose.prod.yml

Substitua `build:` por `image:`:

```yaml
typebot_connector_api:
  image: rannielson/conectortypebot-backend:latest
  # Remove: build: context: .. dockerfile: docker/Dockerfile
  command: node dist/index.js
  # ... resto da configuração

typebot_connector_webhook:
  image: rannielson/conectortypebot-backend:latest
  command: node dist/webhook-server.js
  # ... resto da configuração

typebot_connector_worker:
  image: rannielson/conectortypebot-backend:latest
  command: node dist/workers/index.js
  # ... resto da configuração

typebot_connector_frontend:
  image: rannielson/conectortypebot-frontend:latest
  # Remove: build: context: ../frontend dockerfile: Dockerfile
  # ... resto da configuração
```

## 🔧 Troubleshooting

### Erro: "buildx not found"

```bash
# Docker Desktop já inclui buildx
# Se não funcionar, instale:
docker buildx install
```

### Erro: "platform not supported"

```bash
# Crie e use um builder multi-platform
docker buildx create --name multiarch --use
docker buildx inspect --bootstrap
```

### Container fica em "pending" no Swarm

**Causa**: Imagem buildada para arquitetura errada (ARM64 no macOS vs AMD64 no Linux)

**Solução**: Use o script `build-and-push.sh` que força `--platform linux/amd64`

### Verificar arquitetura da imagem

```bash
# Verificar plataforma da imagem local
docker inspect rannielson/conectortypebot-backend:latest | grep Architecture

# Deve mostrar: "Architecture": "amd64"
```

## 📝 Versões e Tags

### Tags Disponíveis

- `latest` - Última versão
- `1.0.0` - Versão específica (exemplo)

### Criar Versão Específica

```bash
VERSION=1.0.0 ./docker/build-and-push.sh
```

Isso criará:
- `rannielson/conectortypebot-backend:1.0.0`
- `rannielson/conectortypebot-backend:latest`
- `rannielson/conectortypebot-frontend:1.0.0`
- `rannielson/conectortypebot-frontend:latest`

## 🔄 Workflow Recomendado

1. **Desenvolvimento**: Use `docker-compose.yml` (build local)
2. **Testes**: Build local com `--platform linux/amd64`
3. **Produção**: Use `build-and-push.sh` e publique no Docker Hub
4. **Deploy**: Use `docker-compose.prod.yml` com imagens do Docker Hub

## 📊 Tamanho das Imagens

- **Backend**: ~500-600MB (com dependências Node.js)
- **Frontend**: ~200-300MB (Next.js standalone)

## 🔐 Segurança

- ⚠️ **Nunca commite** credenciais no código
- ⚠️ Use **secrets** do Docker Swarm para variáveis sensíveis
- ⚠️ **Revise** as imagens antes de publicar
- ⚠️ Use **tags de versão** em produção (não apenas `latest`)

---

**Última atualização**: Configuração para Linux AMD64 (compatível com VPS Linux)
