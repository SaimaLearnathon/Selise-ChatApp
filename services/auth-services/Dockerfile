# services/auth-services/Dockerfile

# ── Stage 1: build ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# ── Stage 2: production ─────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4001

# ✅ Fixed: was dist/server.js → your entry is app.ts which compiles to dist/app.js
CMD ["node", "dist/app.js"]