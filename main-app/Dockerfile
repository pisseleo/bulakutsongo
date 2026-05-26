FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências
COPY package*.json ./
COPY yarn.lock ./
RUN npm ci

# Copiar código fonte
COPY . .

# Fazer build do Next.js
RUN npm run build

# Imagem final
FROM node:20-alpine

WORKDIR /app

# Copiar apenas o necessário
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["npm", "start"]