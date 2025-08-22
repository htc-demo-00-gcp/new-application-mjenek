# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to avoid conflicts
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install envsubst (it's included in nginx:alpine)
# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration as template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy startup script
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

# Expose port
EXPOSE 80

# Start with startup script
CMD ["/startup.sh"]
