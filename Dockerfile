# Stage 1: Builder
FROM node:25-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

# Stage 2: Bot runner
FROM node:25-alpine AS bot
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser
CMD ["node", "dist/bot/index.js"]

# Stage 3: Dashboard runner
FROM node:25-alpine AS dashboard
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --chown=appuser:appgroup views/ ./views/
COPY --chown=appuser:appgroup public/ ./public/

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/dashboard/index.js"]
