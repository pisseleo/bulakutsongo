# =========================
# Build Stage
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Necessário para Prisma no Alpine
RUN apk add --no-cache openssl

# Copiar package files
COPY package*.json ./

# Copiar prisma schema
COPY prisma ./prisma/

# Instalar dependências
RUN npm install --no-audit --no-fund --loglevel=error --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
# Copiar restante do código
COPY . .

# Gerar Prisma Client ANTES do build
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Remover dependências de desenvolvimento
RUN npm prune --omit=dev

# =========================
# Production Stage
# =========================
FROM node:20-alpine

WORKDIR /app

# Necessário para Prisma Runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copiar artefatos necessários
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Caso utilize prisma.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 4000

CMD ["node", "dist/app.js"]