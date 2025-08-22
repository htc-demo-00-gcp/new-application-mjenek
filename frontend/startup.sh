#!/bin/sh

# Debug: Show environment variables
echo "Starting frontend container..."
echo "BACKEND_HOST: $BACKEND_HOST"
echo "BACKEND_PORT: $BACKEND_PORT"

# Set default values if environment variables are not set
BACKEND_HOST=${BACKEND_HOST:-backend}
BACKEND_PORT=${BACKEND_PORT:-8080}

echo "Using BACKEND_HOST: $BACKEND_HOST"
echo "Using BACKEND_PORT: $BACKEND_PORT"

# Substitute environment variables in nginx config
echo "Substituting environment variables in nginx config..."
envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug: Show the generated nginx config
echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'
