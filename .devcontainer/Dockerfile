FROM mcr.microsoft.com/devcontainers/typescript-node:22

RUN corepack enable && corepack prepare pnpm@10.31.0 --activate && \
    echo "check-update=false" >> /etc/pnpm.rc && \
    echo "auto-install-peers=true" >> /etc/pnpm.rc
