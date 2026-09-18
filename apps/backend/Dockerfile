# Build frontend assets first so the backend can serve the complete application.
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY apps/frontend/package*.json ./
RUN npm ci

COPY apps/frontend/ ./
RUN npm run build

# Build backend
FROM node:20-alpine AS builder

WORKDIR /app/backend

COPY apps/backend/package*.json ./
RUN npm ci

COPY apps/backend/tsconfig.json ./
COPY apps/backend/src ./src

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app/backend

COPY apps/backend/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3001

CMD ["npm", "start"]
