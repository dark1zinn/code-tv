# Match the Bun version used locally (bun.lock text format requires Bun 1.2+).
ARG BUN_VERSION=1.3-alpine

FROM oven/bun:${BUN_VERSION} AS pipeline-builder
WORKDIR /workspace

COPY package.json bun.lock ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build:web && bun run build:server

FROM oven/bun:${BUN_VERSION} AS production-runtime
WORKDIR /app

COPY --from=pipeline-builder /workspace/server/dist ./server/dist
COPY --from=pipeline-builder /workspace/server/package.json ./server/package.json
COPY --from=pipeline-builder /workspace/web/dist ./web/dist
# Despite not needed, we keep it to make sure Bun doesn't complain about the web workspace and lockfile changes.
COPY --from=pipeline-builder /workspace/web/package.json ./web/package.json
COPY --from=pipeline-builder /workspace/package.json /workspace/bun.lock ./

RUN mkdir -p /app/server/data

RUN bun install --filter server --no-cache --production

EXPOSE 3000
VOLUME ["/app/server/data"]

ENV NODE_ENV=production

CMD ["bun", "run", "server/dist/main.js"]
