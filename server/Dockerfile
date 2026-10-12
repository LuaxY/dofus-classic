# Game server (Railway service "server", root directory server/). Accounts live in data/runtime/, a volume.
FROM rust:1-trixie AS build
WORKDIR /app
COPY . .
RUN cargo build --release --locked

FROM debian:trixie-slim
WORKDIR /app
COPY --from=build /app/target/release/dofus-server /usr/local/bin/
COPY data data
ENV DOFUS_DATA=/app/data
CMD ["sh", "-c", "exec dofus-server 0.0.0.0:${PORT:-8080}"]
