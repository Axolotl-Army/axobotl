# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm --ignore-scripts

# Install root dependencies
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Install dashboard dependencies
COPY src/dashboard/package.json src/dashboard/pnpm-lock.yaml* ./src/dashboard/
RUN cd src/dashboard && pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm exec tsc
RUN cd src/dashboard && pnpm exec next build

# Sequelize dynamically requires pg at runtime, but Next.js standalone
# cannot trace dynamic requires. Build a clean flat install to merge later.
RUN mkdir /pg-deps && cd /pg-deps && npm init -y --silent && npm install --omit=dev pg pg-hstore 2>/dev/null

# Stage 2: Bot runner
FROM node:22-alpine AS bot
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
FROM node:22-alpine AS dashboard
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 appgroup \
  && adduser --system --uid 1001 --ingroup appgroup appuser

# Next.js standalone output includes a minimal server + node_modules
COPY --from=builder --chown=appuser:appgroup /app/src/dashboard/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/src/dashboard/.next/static ./.next/static
COPY --from=builder --chown=appuser:appgroup /app/src/dashboard/public ./public

# Merge pg + pg-hstore into node_modules (not traced by Next.js standalone)
COPY --from=builder --chown=appuser:appgroup /pg-deps/node_modules ./node_modules

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
