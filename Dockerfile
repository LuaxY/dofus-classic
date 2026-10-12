# Website + game client, static (Railway service "web"). The game server is server/Dockerfile.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY web web
ARG VITE_SERVER_URL
RUN bun run build

FROM caddy:2-alpine
COPY --from=build /app/web/dist /srv
RUN printf ':{$PORT:8080}\nroot * /srv\nencode zstd gzip\nfile_server\n' > /etc/caddy/Caddyfile
