FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./

# Install build tools and libssl1.1
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libssl1.1 \
  && rm -rf /var/lib/apt/lists/*

RUN npm install
COPY . .
RUN ./node_modules/.bin/prisma generate
RUN npm run build

# ── Stage 2: production ─────────────────────────
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install libssl1.1 for Prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl1.1 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4001
CMD ["sh", "-c", "while true; do ./node_modules/.bin/prisma db push --accept-data-loss && break; echo 'Retrying in 5s...'; sleep 5; done && node dist/app.js"]