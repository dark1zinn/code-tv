FROM oven/bun:1.1-alpine AS pipeline-builder
WORKDIR /workspace

COPY package.json bun.lock ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build:web && bun run build:server

FROM oven/bun:1.1-alpine AS production-runtime
WORKDIR /app

COPY --from=pipeline-builder /workspace/server/dist ./server/dist
COPY --from=pipeline-builder /workspace/server/node_modules ./server/node_modules
COPY --from=pipeline-builder /workspace/server/package.json ./server/package.json
COPY --from=pipeline-builder /workspace/web/dist ./web/dist

RUN mkdir -p /app/server/data

EXPOSE 3000
VOLUME ["/app/server/data"]

ENV NODE_ENV=production

CMD ["bun", "run", "server/dist/main.js"]
