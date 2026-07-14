# ------------------------------------------------------------
# Stage 1 - Install dependencies
# ------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Build-time DATABASE_URL only for prisma generate
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

RUN npm ci --legacy-peer-deps

RUN npx prisma generate

# ------------------------------------------------------------
# Stage 2 - Build Next.js
# ------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./
COPY --from=deps /app/src/lib/generated ./src/lib/generated

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ------------------------------------------------------------
# Stage 3 - Production
# ------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Create non-root user
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/lib/generated ./src/lib/generated

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]