#!/bin/bash

# Development Deployment Script for fm-repo-manager
# This script deploys the development environment on port 3013

set -e  # Exit on any error

# Configuration
IMAGE_NAME="fm-repo-manager-dev"
CONTAINER_NAME="fm-repo-manager-dev"
DEV_PORT=3013
CONTAINER_PORT=3013

echo "🚀 Starting development deployment for fm-repo-manager..."

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
echo "🧹 Cleaning up existing development container..."
docker stop ${CONTAINER_NAME} 2>/dev/null || echo "No existing container to stop"
docker rm ${CONTAINER_NAME} 2>/dev/null || echo "No existing container to remove"

# Build development image
echo "🔨 Building development Docker image..."
docker build -f Dockerfile -t ${IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo "❌ Failed to build development image"
    exit 1
fi

# Run development container
echo "🚀 Starting development container..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    -p ${DEV_PORT}:${CONTAINER_PORT} \
    -e NODE_ENV=development \
    -e PORT=${CONTAINER_PORT} \
    --restart unless-stopped \
    "${IMAGE_NAME}"

if [ $? -ne 0 ]; then
    echo "❌ Failed to start development container"
    exit 1
fi

echo "⏳ Waiting for container to start..."
sleep 10

# Verify deployment
echo "🔍 Verifying development deployment..."

# Check container status
echo "Container status:"
docker ps -f name=${CONTAINER_NAME}

# Check container logs
echo "Container logs:"
docker logs ${CONTAINER_NAME} --tail 20

# Check if port is accessible
echo "Testing port accessibility..."
timeout 10 bash -c "until curl -f http://localhost:${DEV_PORT}/ >/dev/null 2>&1; do sleep 1; done" || {
    echo "❌ Port ${DEV_PORT} not accessible"
    echo "🔍 Checking container processes..."
    docker exec ${CONTAINER_NAME} ps aux || echo "Could not check processes"
    echo "🔍 Checking port binding..."
    docker port ${CONTAINER_NAME} || echo "Could not check port binding"
    exit 1
}

# Test health endpoint
echo "Testing health endpoint..."
curl -f http://localhost:${DEV_PORT}/health || echo "⚠️ Health endpoint not accessible"

echo "✅ Development deployment successful!"
echo "🌐 Application accessible at: http://localhost:${DEV_PORT}"
echo "🏥 Health check: http://localhost:${DEV_PORT}/health"
echo "📊 Container logs: docker logs ${CONTAINER_NAME}"
