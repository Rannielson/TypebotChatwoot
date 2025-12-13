FROM node:20-alpine

WORKDIR /app

# Instala dependências de build e postgresql-client para pg_isready
RUN apk add --no-cache python3 make g++ postgresql-client

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências (incluindo dev para migrations)
# Garante que não há node_modules pré-existente
RUN rm -rf node_modules
RUN npm install
# Recompila bcrypt especificamente para Linux Alpine
RUN npm rebuild bcrypt --build-from-source

# Copia código fonte (excluindo node_modules via .dockerignore)
# Usa --exclude para garantir que node_modules não seja copiado mesmo se .dockerignore falhar
COPY --exclude=node_modules . .

# Verifica se bcrypt ainda está funcionando após COPY
RUN node -e "require('bcrypt')" || (rm -rf node_modules/bcrypt && npm install bcrypt --build-from-source)

# Compila TypeScript (node_modules já está instalado e bcrypt já foi recompilado)
RUN npm run build

# Copia script de entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expõe porta
EXPOSE 3000

# Entrypoint para executar migrations antes de iniciar
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]

