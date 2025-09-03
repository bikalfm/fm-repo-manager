#!/bin/bash

# Production Deployment Script for fm-repo-manager
# This script deploys the production environment on port 3005

set -e  # Exit on any error

# Configuration
IMAGE_NAME="fm-repo-manager-prod"
CONTAINER_NAME="fm-repo-manager-prod"
PROD_PORT=3005
CONTAINER_PORT=80

echo "🚀 Starting production deployment for fm-repo-manager..."

# Function to handle errors
handle_error() {
    echo "❌ Error occurred at line $1"
    echo "🔍 Checking container logs..."
    docker logs ${CONTAINER_NAME} --tail 50 || echo "Could not retrieve logs"
    echo "🔍 Checking container status..."
    docker ps -a | grep ${CONTAINER_NAME} || echo "Container not found"
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Network diagnostics
echo "🔍 Running network diagnostics..."
echo "Host IP addresses:"
hostname -I || ip addr show | grep inet || echo "Could not determine host IP"

echo "Current port usage:"
netstat -tlnp | grep -E ":(3005|3013)" || echo "No services found on target ports"

# Clean up existing container
echo "🧹 Cleaning up existing production container..."
docker stop ${CONTAINER_NAME} 2>/dev/null || echo "No existing container to stop"
docker rm ${CONTAINER_NAME} 2>/dev/null || echo "No existing container to remove"

# Build production image
echo "🔨 Building production Docker image..."
docker build -f Dockerfile.production -t ${IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo "❌ Failed to build production image"
    exit 1
fi

# Run production container
echo "🚀 Starting production container..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    -p ${PROD_PORT}:${CONTAINER_PORT} \
    -e NODE_ENV=production \
    -e PORT=${PROD_PORT} \
    --restart unless-stopped \
    "${IMAGE_NAME}"

if [ $? -ne 0 ]; then
    echo "❌ Failed to start production container"
    exit 1
fi

echo "⏳ Waiting for container to start..."
sleep 15

# Verify deployment
echo "🔍 Verifying production deployment..."

# Check container status
echo "Container status:"
docker ps -f name=${CONTAINER_NAME}

# Check container logs
echo "Container logs:"
docker logs ${CONTAINER_NAME} --tail 20

# Check nginx configuration
echo "Testing nginx configuration..."
docker exec ${CONTAINER_NAME} nginx -t || echo "⚠️ Nginx configuration test failed"

# Check if nginx is listening
echo "Checking nginx port binding..."
docker exec ${CONTAINER_NAME} netstat -tlnp | grep :80 || echo "⚠️ Nginx not listening on port 80"

# Check if port is accessible
echo "Testing port accessibility..."
timeout 15 bash -c "until curl -f http://localhost:${PROD_PORT}/ >/dev/null 2>&1; do sleep 1; done" || {
    echo "❌ Port ${PROD_PORT} not accessible"
    echo "🔍 Checking container processes..."
    docker exec ${CONTAINER_NAME} ps aux || echo "Could not check processes"
    echo "🔍 Checking port binding..."
    docker port ${CONTAINER_NAME} || echo "Could not check port binding"
    echo "🔍 Checking nginx error logs..."
    docker exec ${CONTAINER_NAME} cat /var/log/nginx/error.log 2>/dev/null || echo "Could not read nginx error log"
    exit 1
}

# Test health endpoint
echo "Testing health endpoint..."
curl -f http://localhost:${PROD_PORT}/health || echo "⚠️ Health endpoint not accessible"

# Test static assets
echo "Testing static asset serving..."
curl -f http://localhost:${PROD_PORT}/index.html >/dev/null || echo "⚠️ Static assets not accessible"

echo "✅ Production deployment successful!"
echo "🌐 Application accessible at: http://localhost:${PROD_PORT}"
echo "🏥 Health check: http://localhost:${PROD_PORT}/health"
echo "📊 Container logs: docker logs ${CONTAINER_NAME}"
