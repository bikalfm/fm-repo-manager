# FM Repo Manager - Dual Environment Deployment

This document describes the dual environment deployment setup for the FM Repo Manager application, supporting both development and production environments with separate ports.

## 🏗️ Architecture Overview

### Port Configuration
- **Development Environment**: Port `3013`
- **Production Environment**: Port `3005`
- **External Access**: Both environments accessible via `0.0.0.0` binding

### Container Configuration
- **Development Container**: `fm-repo-manager-dev`
- **Production Container**: `fm-repo-manager-prod`
- **Development Image**: `fm-repo-manager-dev`
- **Production Image**: `fm-repo-manager-prod`

## 🚀 Deployment Methods

### 1. Jenkins Pipeline (Recommended)
The Jenkins pipeline automatically deploys both environments with comprehensive error handling and diagnostics.

**Pipeline Features:**
- Network diagnostics and port checking
- Comprehensive error handling with try-catch blocks
- Container health checks and verification
- Automatic script permission setting (`chmod +x`)
- Detailed logging and troubleshooting information

### 2. Manual Deployment Scripts

#### Development Environment
```bash
chmod +x deploy-dev.sh
./deploy-dev.sh
```

#### Production Environment
```bash
chmod +x deploy-prod.sh
./deploy-prod.sh
```

#### Both Environments
```bash
chmod +x deploy-both.sh
./deploy-both.sh
```

## 🌐 Access URLs

### Development Environment
- **Application**: http://jenkins.finalmoment.ai:3013
- **Health Check**: http://jenkins.finalmoment.ai:3013/health
- **Local Access**: http://localhost:3013

### Production Environment
- **Application**: http://jenkins.finalmoment.ai:3005
- **Health Check**: http://jenkins.finalmoment.ai:3005/health
- **Local Access**: http://localhost:3005

## 🔧 Configuration Details

### Development Environment
- **Base Image**: `node:20-alpine`
- **Port**: 3013 (internal and external)
- **Environment**: `NODE_ENV=development`
- **Server**: Vite development server
- **Features**: Hot reload, source maps, development tools

### Production Environment
- **Base Image**: `nginx:1.25-alpine`
- **Port**: 80 (internal) → 3005 (external)
- **Environment**: `NODE_ENV=production`
- **Server**: Nginx with static file serving
- **Features**: Optimized builds, compression, caching

## 🏥 Health Monitoring

### Health Endpoints
Both environments provide health check endpoints:
- Development: `GET /health` → Returns "healthy"
- Production: `GET /health` → Returns "healthy"

### Monitoring Commands
```bash
# Check container status
docker ps -f name=fm-repo-manager

# View development logs
docker logs fm-repo-manager-dev

# View production logs
docker logs fm-repo-manager-prod

# Test health endpoints
curl http://localhost:3013/health
curl http://localhost:3005/health
```

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. Permission Denied Errors
```bash
# Make scripts executable
chmod +x *.sh
```

#### 2. Port Already in Use
```bash
# Check port usage
netstat -tlnp | grep -E ":(3005|3013)"

# Stop conflicting containers
docker stop fm-repo-manager-dev fm-repo-manager-prod
```

#### 3. Container Won't Start
```bash
# Check container logs
docker logs fm-repo-manager-dev --tail 50
docker logs fm-repo-manager-prod --tail 50

# Check container status
docker ps -a | grep fm-repo-manager
```

#### 4. Application Not Accessible
```bash
# Test local connectivity
curl -f http://localhost:3013/
curl -f http://localhost:3005/

# Check port binding
docker port fm-repo-manager-dev
docker port fm-repo-manager-prod
```

#### 5. Nginx Configuration Issues (Production)
```bash
# Test nginx configuration
docker exec fm-repo-manager-prod nginx -t

# Check nginx error logs
docker exec fm-repo-manager-prod cat /var/log/nginx/error.log
```

### Network Diagnostics
```bash
# Check host IP addresses
hostname -I

# Check port usage
netstat -tlnp | grep -E ":(3005|3013)"

# Test external access
curl -f http://jenkins.finalmoment.ai:3013/health
curl -f http://jenkins.finalmoment.ai:3005/health
```

## 📊 Environment Variables

### Development Environment
- `NODE_ENV=development`
- `PORT=3013`

### Production Environment
- `NODE_ENV=production`
- `PORT=3005`

## 🔄 Build Process

### Development Build
```bash
# Build development image
docker build -f Dockerfile -t fm-repo-manager-dev .

# Run development container
docker run -d --name fm-repo-manager-dev -p 3013:3013 fm-repo-manager-dev
```

### Production Build
```bash
# Build production image
docker build -f Dockerfile.production -t fm-repo-manager-prod .

# Run production container
docker run -d --name fm-repo-manager-prod -p 3005:80 fm-repo-manager-prod
```

## 🧹 Cleanup Commands

```bash
# Stop and remove containers
docker stop fm-repo-manager-dev fm-repo-manager-prod
docker rm fm-repo-manager-dev fm-repo-manager-prod

# Remove images
docker rmi fm-repo-manager-dev fm-repo-manager-prod

# Clean up dangling resources
docker system prune -f
```

## 📝 Development Workflow

1. **Local Development**: Use `npm run dev` for local development on port 3013
2. **Testing**: Use `npm run preview:dev` to test development build
3. **Production Testing**: Use `npm run preview:prod` to test production build
4. **Deployment**: Push to repository to trigger Jenkins pipeline

## 🔐 Security Considerations

- Production environment uses nginx for static file serving
- Health endpoints are available for monitoring
- Containers run with `--restart unless-stopped` for reliability

## 📞 Support

For deployment issues:
1. Check Jenkins pipeline logs
2. Review container logs using the monitoring commands above
3. Verify network connectivity and port availability
4. Check system resources (disk space, memory)
