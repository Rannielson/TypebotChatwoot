#!/bin/bash
set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
DOCKER_USERNAME="${DOCKER_USERNAME:-rannielson}"
IMAGE_NAME="conectortypebot"
VERSION="${VERSION:-latest}"
PLATFORM="linux/amd64"  # IMPORTANTE: Build para Linux AMD64 (compatível com VPS Linux)

echo -e "${BLUE}🐳 Build e Push das Imagens Docker (Linux AMD64)${NC}"
echo -e "${BLUE}==================================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Buildando para plataforma ${PLATFORM}${NC}"
echo -e "${YELLOW}   Isso garante compatibilidade com servidores Linux${NC}"
echo ""

# Verifica se está logado no Docker Hub
if ! docker info | grep -q "Username"; then
  echo -e "${YELLOW}⚠️  Você precisa estar logado no Docker Hub${NC}"
  echo -e "${YELLOW}Execute: docker login${NC}"
  exit 1
fi

# Verifica se buildx está disponível e cria builder se necessário
if ! docker buildx ls | grep -q "multiarch"; then
  echo -e "${BLUE}🔧 Configurando Docker Buildx para multi-platform...${NC}"
  docker buildx create --name multiarch --use 2>/dev/null || docker buildx use multiarch
  docker buildx inspect --bootstrap
  echo ""
fi

# Diretório raiz do projeto
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}📦 Buildando imagem Backend (${PLATFORM})...${NC}"
docker buildx build \
  --platform ${PLATFORM} \
  --load \
  -f docker/Dockerfile \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-backend:${VERSION} \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-backend:latest \
  .

echo ""
echo -e "${GREEN}📦 Buildando imagem Frontend (${PLATFORM})...${NC}"
docker buildx build \
  --platform ${PLATFORM} \
  --load \
  -f frontend/Dockerfile \
  --target runner-prod \
  --build-arg BUILD_ENV=production \
  --build-arg NEXT_PUBLIC_API_URL=https://apiconnect.atomos.tech/api \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-frontend:${VERSION} \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-frontend:latest \
  frontend/

echo ""
echo -e "${GREEN}🚀 Fazendo push das imagens para Docker Hub...${NC}"
echo ""

echo -e "${BLUE}→ Push Backend (${PLATFORM})...${NC}"
docker buildx build \
  --platform ${PLATFORM} \
  --push \
  -f docker/Dockerfile \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-backend:${VERSION} \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-backend:latest \
  .

echo ""
echo -e "${BLUE}→ Push Frontend (${PLATFORM})...${NC}"
docker buildx build \
  --platform ${PLATFORM} \
  --push \
  -f frontend/Dockerfile \
  --target runner-prod \
  --build-arg BUILD_ENV=production \
  --build-arg NEXT_PUBLIC_API_URL=https://apiconnect.atomos.tech/api \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-frontend:${VERSION} \
  -t ${DOCKER_USERNAME}/${IMAGE_NAME}-frontend:latest \
  frontend/

echo ""
echo -e "${GREEN}✅ Imagens publicadas com sucesso!${NC}"
echo ""
echo -e "${BLUE}📋 Imagens disponíveis (${PLATFORM}):${NC}"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}-backend:${VERSION}"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}-backend:latest"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}-frontend:${VERSION}"
echo "  - ${DOCKER_USERNAME}/${IMAGE_NAME}-frontend:latest"
echo ""
echo -e "${GREEN}✅ Compatibilidade: Linux AMD64 (VPS Linux)${NC}"
echo ""
echo -e "${YELLOW}💡 Para usar uma versão específica:${NC}"
echo -e "${YELLOW}   VERSION=1.0.0 ./docker/build-and-push.sh${NC}"
