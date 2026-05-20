FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copiar todo o código fonte (incluindo tsconfig.json)
COPY . .

# Compilar TypeScript
RUN npm run build

# Remover dev dependencies
RUN npm prune --production

# Gerar cliente Prisma (versão 7 com adaptador)
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 4000

CMD ["node", "dist/app.js"]