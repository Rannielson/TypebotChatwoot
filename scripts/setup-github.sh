#!/bin/bash

# Script para configurar e fazer push para GitHub
# Uso: ./scripts/setup-github.sh SEU_USUARIO NOME_DO_REPOSITORIO

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "❌ Uso: ./scripts/setup-github.sh SEU_USUARIO NOME_DO_REPOSITORIO"
    echo "Exemplo: ./scripts/setup-github.sh lucivaldoquirino TypebotChatwoot"
    exit 1
fi

GITHUB_USER=$1
REPO_NAME=$2
GITHUB_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "🔧 Configurando repositório remoto..."
git remote add origin "$GITHUB_URL" 2>/dev/null || git remote set-url origin "$GITHUB_URL"

echo "📤 Fazendo push para GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Push realizado com sucesso!"
    echo "🌐 Repositório: $GITHUB_URL"
else
    echo "❌ Erro ao fazer push. Verifique:"
    echo "   1. Se o repositório existe no GitHub"
    echo "   2. Se você tem permissão para fazer push"
    echo "   3. Se suas credenciais estão configuradas"
fi
