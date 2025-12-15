FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files (otimizado para cache de layers)
COPY package.json package-lock.json* ./
# Usa npm ci para instalação mais rápida e determinística
RUN if [ -f package-lock.json ]; then npm ci --only=production=false; else npm install; fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copia apenas node_modules (otimiza cache)
COPY --from=deps /app/node_modules ./node_modules
# Copia código fonte
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ARG BUILD_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build for production with Turbopack (Next.js 16+)
# If BUILD_ENV=development, skip build (will use dev mode with Turbopack)
RUN if [ "$BUILD_ENV" = "production" ]; then \
      NODE_ENV=production npm run build; \
    else \
      echo "Skipping build - will use dev mode with Turbopack"; \
    fi

# Production runner - optimized standalone build
FROM base AS runner-prod
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia apenas arquivos necessários para produção (standalone)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# Development runner - uses Turbopack dev server
FROM base AS runner-dev
WORKDIR /app

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Copia tudo para dev mode (com hot reload)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app ./

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]

# Default to development (hot reload com Turbopack)
FROM runner-dev
