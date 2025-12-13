#!/bin/sh
set -e

echo "Aguardando PostgreSQL estar pronto..."
until pg_isready -h "${POSTGRES_HOST:-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}"; do
  echo "PostgreSQL não está pronto ainda. Aguardando..."
  sleep 2
done

echo "PostgreSQL está pronto!"

echo "Executando migrations..."
npm run migrate

echo "Migrations concluídas!"

echo "Iniciando aplicação..."
exec "$@"

