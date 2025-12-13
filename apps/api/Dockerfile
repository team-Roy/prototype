# Use Debian slim instead of Alpine to avoid OpenSSL compatibility issues with Prisma
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy package files
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including dev for build)
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

# Remove source files and unnecessary packages to reduce image size
# Keep node_modules intact to preserve workspace symlinks
RUN rm -rf apps/api/src apps/api/test packages/shared/src && \
    rm -rf apps/api/node_modules/.cache packages/shared/node_modules/.cache && \
    rm -rf .git

# Create non-root user (Debian syntax)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nestjs && \
    chown -R nestjs:nodejs /app

USER nestjs

WORKDIR /app/apps/api

# Railway uses PORT env variable
ENV PORT=3001
EXPOSE 3001

# Start server
CMD ["node", "dist/main.js"]
