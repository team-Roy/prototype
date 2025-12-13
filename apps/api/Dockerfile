# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy package files
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY turbo.json ./

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build shared package first, then api
WORKDIR /app
RUN pnpm --filter @fandom/shared build && pnpm --filter @fandom/api build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy necessary files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Railway uses PORT env variable, default to 3001
ENV PORT=3001
EXPOSE 3001

# Start server (Railway handles health checks via their dashboard)
CMD ["node", "dist/main.js"]
