# ---------- Stage 1: Build ----------
FROM node:18-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---------- Stage 2: Runner ----------
FROM node:18-slim AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "--enable-source-maps", "dist/index.js"]
