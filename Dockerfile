# ── Stage 1: build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate && npm run build

# ── Stage 2: production ──────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/main"]
