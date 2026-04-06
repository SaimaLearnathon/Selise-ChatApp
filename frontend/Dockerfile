# frontend/Dockerfile

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_AUTH_URL=https://auth-services.redground-f9d124ef.centralindia.azurecontainerapps.io/api/auth
ENV NEXT_PUBLIC_SOCKET_URL=https://chat-services.redground-f9d124ef.centralindia.azurecontainerapps.io

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
