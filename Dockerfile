# Multi-stage build for Vue.js frontend
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_API_HOST
ARG VITE_API_PORT
ARG VITE_API_PROTOCOL
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APPLE_CLIENT_ID

# Set environment variables from build arguments
ENV VITE_API_HOST=$VITE_API_HOST
ENV VITE_API_PORT=$VITE_API_PORT
ENV VITE_API_PROTOCOL=$VITE_API_PROTOCOL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_APPLE_CLIENT_ID=$VITE_APPLE_CLIENT_ID

# Copy package files
COPY package*.json ./
COPY .nvmrc ./

# Copy scripts needed for build
COPY scripts/ scripts/

# Install dependencies (use legacy peer deps to resolve Vite conflict)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Set NODE_ENV to production for build
ENV NODE_ENV=production

# Build the application (skip type checking for production build)
RUN npm run build-only

# Production stage with nginx
FROM nginx:alpine

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]