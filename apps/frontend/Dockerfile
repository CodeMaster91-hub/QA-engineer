FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
RUN npm install --workspace=apps/frontend

# Copy source
COPY apps/frontend/ ./apps/frontend/

# Build
WORKDIR /app/apps/frontend
RUN npm run build

# Production
FROM nginx:alpine AS production

COPY --from=base /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
