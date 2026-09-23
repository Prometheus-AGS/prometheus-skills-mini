FROM rust:1.97.1-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev clang cmake && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY . .
RUN cargo build --release --locked --package liter-llm-cli

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 && rm -rf /var/lib/apt/lists/* && useradd -m -u 1001 gateway
COPY --from=builder /build/target/release/liter-llm /usr/local/bin/liter-llm
USER gateway
EXPOSE 4000
ENTRYPOINT ["liter-llm"]
CMD ["api", "--host", "0.0.0.0", "--port", "4000"]
