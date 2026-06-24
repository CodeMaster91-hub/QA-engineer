FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/
RUN npm install --workspace=apps/backend --omit=dev

# Copy source
COPY apps/backend/ ./apps/backend/

# Build
WORKDIR /app/apps/backend
RUN npm run build

# Production
FROM node:22-alpine AS production

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/backend/dist ./dist
COPY --from=base /app/apps/backend/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
