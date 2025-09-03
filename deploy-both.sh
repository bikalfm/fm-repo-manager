#!/bin/bash

# Dual Environment Deployment Script for fm-repo-manager
# This script deploys both development and production environments

set -e  # Exit on any error

echo "🚀 Starting dual environment deployment for fm-repo-manager..."

# Function to handle errors
handle_error() {
    echo "❌ Error occurred at line $1"
    echo "🔍 Checking all container logs..."
    docker logs fm-repo-manager-dev --tail 20 2>/dev/null || echo "Dev container logs not available"
    docker logs fm-repo-manager-prod --tail 20 2>/dev/null || echo "Prod container logs not available"
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

# Deploy development environment
echo "🔧 Deploying development environment..."
chmod +x deploy-dev.sh
./deploy-dev.sh

echo "⏳ Waiting between deployments..."
sleep 5

# Deploy production environment
echo "🔧 Deploying production environment..."
chmod +x deploy-prod.sh
./deploy-prod.sh

# Final verification
echo "🔍 Final verification of both environments..."

echo "Development environment status:"
docker ps -f name=fm-repo-manager-dev

echo "Production environment status:"
docker ps -f name=fm-repo-manager-prod

echo "Testing both endpoints..."
curl -f http://localhost:3013/health && echo "✅ Dev health check passed" || echo "❌ Dev health check failed"
curl -f http://localhost:3005/health && echo "✅ Prod health check passed" || echo "❌ Prod health check failed"

echo "✅ Dual environment deployment successful!"
echo "🌐 Development app: http://localhost:3013"
echo "🌐 Production app: http://localhost:3005"
echo "🏥 Dev health: http://localhost:3013/health"
echo "🏥 Prod health: http://localhost:3005/health"
