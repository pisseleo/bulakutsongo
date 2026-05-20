FROM node:20-alpine AS builder

WORKDIR /app

# Copiar ficheiros de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências (incluindo dev)
RUN npm ci

# Copiar código fonte e compilar TypeScript
COPY . .
RUN npm run build

# Remover dependências dev
RUN npm prune --production

# Gerar cliente Prisma (já na versão 7)
RUN npx prisma generate

# Imagem final
FROM node:20-alpine

WORKDIR /app

# Copiar artefactos da build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts   # importante para Prisma 7

EXPOSE 4000

CMD ["node", "dist/app.js"]