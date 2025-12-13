# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

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

# Build shared package first
RUN pnpm --filter @fandom/shared build

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

# Build API
WORKDIR /app
RUN pnpm --filter @fandom/api build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies directly with npm
COPY apps/api/package.json ./

# Copy built files
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy shared package dist
COPY --from=builder /app/packages/shared/dist ./node_modules/@fandom/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@fandom/shared/

# Copy Prisma client from builder
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.pnpm/prisma@*/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Install production dependencies
RUN npm install --omit=dev --ignore-scripts

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

# Railway uses PORT env variable
ENV PORT=3001
EXPOSE 3001

# Start server
CMD ["node", "dist/main.js"]
