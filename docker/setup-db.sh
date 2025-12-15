#!/bin/sh
set -e

echo "🔍 Aguardando PostgreSQL estar pronto..."
until pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}"; do
  echo "⏳ PostgreSQL não está pronto ainda. Aguardando..."
  sleep 2
done

echo "✅ PostgreSQL está pronto!"

echo "📦 Executando migrations..."
npm run migrate

echo "✅ Migrations concluídas!"

echo "🌱 Executando seed (criando usuário admin padrão)..."
npm run seed

echo "✅ Setup do banco de dados concluído!"
echo ""
echo "📝 Credenciais padrão do admin:"
echo "   Email: admin@example.com"
echo "   Senha: admin123"
echo "   ⚠️  IMPORTANTE: Altere a senha após o primeiro login!"
