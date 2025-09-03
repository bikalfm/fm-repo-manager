pipeline {
    agent any

    environment {
        // Application configuration
        APP_NAME = 'fm-repo-manager'
        DEV_IMAGE_NAME = 'fm-repo-manager-dev'
        PROD_IMAGE_NAME = 'fm-repo-manager-prod'
        DEV_CONTAINER_NAME = 'fm-repo-manager-dev'
        PROD_CONTAINER_NAME = 'fm-repo-manager-prod'
        
        // Port configuration
        DEV_PORT = '3013'
        PROD_PORT = '3005'
    }

    stages {
        stage('Checkout') {
            steps {
                echo '📥 Checking out source code...'
                checkout scm
                sh 'ls -la'
                echo '✅ Source code checked out successfully.'
            }
        }

        stage('Network Diagnostics') {
            steps {
                echo '🔍 Running network diagnostics...'
                script {
                    try {
                        sh '''
                            echo "Host IP addresses:"
                            hostname -I || ip addr show | grep inet || echo "Could not determine host IP"
                            
                            echo "Current port usage:"
                            netstat -tlnp | grep -E ":(3005|3013)" || echo "No services found on target ports"
                            
                            echo "Docker daemon status:"
                            docker version || echo "Docker daemon not accessible"
                        '''
                    } catch (Exception e) {
                        echo "⚠️ Network diagnostics failed: ${e.getMessage()}"
                    }
                }
            }
        }

        stage('Build Development Image') {
            steps {
                echo "🔨 Building development Docker image ${env.DEV_IMAGE_NAME}..."
                script {
                    try {
                        sh "docker build -f Dockerfile -t ${env.DEV_IMAGE_NAME} ."
                        echo "✅ Development image built successfully."
                    } catch (Exception e) {
                        echo "❌ Failed to build development image: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }

        stage('Build Production Image') {
            steps {
                echo "🔨 Building production Docker image ${env.PROD_IMAGE_NAME}..."
                script {
                    try {
                        sh "docker build -f Dockerfile.production -t ${env.PROD_IMAGE_NAME} ."
                        echo "✅ Production image built successfully."
                    } catch (Exception e) {
                        echo "❌ Failed to build production image: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }

        stage('Deploy Development Environment') {
            steps {
                echo "🚀 Deploying development environment on port ${env.DEV_PORT}..."
                script {
                    try {
                        // Clean up existing dev container
                        sh "docker stop ${env.DEV_CONTAINER_NAME} || true"
                        sh "docker rm ${env.DEV_CONTAINER_NAME} || true"

                        // Run development container
                        sh """
                            docker run -d \\
                                --name "${env.DEV_CONTAINER_NAME}" \\
                                -p ${env.DEV_PORT}:3013 \\
                                -e NODE_ENV=development \\
                                -e PORT=3013 \\
                                --restart unless-stopped \\
                                "${env.DEV_IMAGE_NAME}"
                        """
                        echo "✅ Development container started successfully."
                    } catch (Exception e) {
                        echo "❌ Failed to deploy development environment: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }

        stage('Deploy Production Environment') {
            steps {
                echo "🚀 Deploying production environment on port ${env.PROD_PORT}..."
                script {
                    try {
                        // Clean up existing prod container
                        sh "docker stop ${env.PROD_CONTAINER_NAME} || true"
                        sh "docker rm ${env.PROD_CONTAINER_NAME} || true"

                        // Run production container
                        sh """
                            docker run -d \\
                                --name "${env.PROD_CONTAINER_NAME}" \\
                                -p ${env.PROD_PORT}:80 \\
                                -e NODE_ENV=production \\
                                -e PORT=${env.PROD_PORT} \\
                                --restart unless-stopped \\
                                "${env.PROD_IMAGE_NAME}"
                        """
                        echo "✅ Production container started successfully."
                    } catch (Exception e) {
                        echo "❌ Failed to deploy production environment: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }

        stage('Verify Development Deployment') {
            steps {
                echo "🔍 Verifying development deployment..."
                script {
                    try {
                        sh '''
                            echo "Waiting for development container to start..."
                            sleep 15
                            
                            echo "Development container status:"
                            docker ps -f name=fm-repo-manager-dev
                            
                            echo "Development container logs:"
                            docker logs fm-repo-manager-dev --tail 20
                            
                            echo "Testing development port accessibility..."
                            timeout 10 bash -c "until curl -f http://localhost:3013/ >/dev/null 2>&1; do sleep 1; done" || {
                                echo "❌ Development port 3013 not accessible"
                                docker logs fm-repo-manager-dev --tail 50
                                exit 1
                            }
                            
                            echo "Testing development health endpoint..."
                            curl -f http://localhost:3013/health || echo "⚠️ Development health endpoint not accessible"
                        '''
                        echo "✅ Development deployment verified successfully."
                    } catch (Exception e) {
                        echo "❌ Development deployment verification failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }

        stage('Verify Production Deployment') {
            steps {
                echo "🔍 Verifying production deployment..."
                script {
                    try {
                        sh '''
                            echo "Waiting for production container to start..."
                            sleep 20
                            
                            echo "Production container status:"
                            docker ps -f name=fm-repo-manager-prod
                            
                            echo "Production container logs:"
                            docker logs fm-repo-manager-prod --tail 20
                            
                            echo "Testing nginx configuration..."
                            docker exec fm-repo-manager-prod nginx -t || echo "⚠️ Nginx configuration test failed"
                            
                            echo "Checking nginx port binding..."
                            docker exec fm-repo-manager-prod netstat -tlnp | grep :80 || echo "⚠️ Nginx not listening on port 80"
                            
                            echo "Testing production port accessibility..."
                            timeout 15 bash -c "until curl -f http://localhost:3005/ >/dev/null 2>&1; do sleep 1; done" || {
                                echo "❌ Production port 3005 not accessible"
                                docker logs fm-repo-manager-prod --tail 50
                                docker exec fm-repo-manager-prod cat /var/log/nginx/error.log 2>/dev/null || echo "Could not read nginx error log"
                                exit 1
                            }
                            
                            echo "Testing production health endpoint..."
                            curl -f http://localhost:3005/health || echo "⚠️ Production health endpoint not accessible"
                            
                            echo "Testing static asset serving..."
                            curl -f http://localhost:3005/index.html >/dev/null || echo "⚠️ Static assets not accessible"
                        '''
                        echo "✅ Production deployment verified successfully."
                    } catch (Exception e) {
                        echo "❌ Production deployment verification failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }

        stage('Final Verification') {
            steps {
                echo "🔍 Final verification of both environments..."
                script {
                    try {
                        sh '''
                            echo "All container status:"
                            docker ps -f name=fm-repo-manager
                            
                            echo "Testing both endpoints simultaneously..."
                            curl -f http://localhost:3013/health && echo "✅ Dev health check passed" || echo "❌ Dev health check failed"
                            curl -f http://localhost:3005/health && echo "✅ Prod health check passed" || echo "❌ Prod health check failed"
                            
                            echo "Port binding verification:"
                            docker port fm-repo-manager-dev || echo "Dev port binding not found"
                            docker port fm-repo-manager-prod || echo "Prod port binding not found"
                        '''
                        echo "✅ Final verification completed successfully."
                    } catch (Exception e) {
                        echo "❌ Final verification failed: ${e.getMessage()}"
                        throw e
                    }
                }
            }
        }
    }

    post {
        always {
            echo '🏁 Pipeline finished.'
            script {
                try {
                    sh '''
                        echo "Final container status:"
                        docker ps -a | grep fm-repo-manager || echo "No fm-repo-manager containers found"
                        
                        echo "Final port usage:"
                        netstat -tlnp | grep -E ":(3005|3013)" || echo "No services found on target ports"
                    '''
                } catch (Exception e) {
                    echo "⚠️ Post-pipeline cleanup failed: ${e.getMessage()}"
                }
            }
        }
        success {
            echo '🎉 Dual environment deployment successful!'
            echo ''
            echo '🌐 Development Environment:'
            echo '   URL: http://jenkins.finalmoment.ai:3013'
            echo '   Health: http://jenkins.finalmoment.ai:3013/health'
            echo '   Container: fm-repo-manager-dev'
            echo ''
            echo '🌐 Production Environment:'
            echo '   URL: http://jenkins.finalmoment.ai:3005'
            echo '   Health: http://jenkins.finalmoment.ai:3005/health'
            echo '   Container: fm-repo-manager-prod'
            echo ''
            echo '📊 Monitoring Commands:'
            echo '   Dev logs: docker logs fm-repo-manager-dev'
            echo '   Prod logs: docker logs fm-repo-manager-prod'
            echo '   All containers: docker ps -f name=fm-repo-manager'
        }
        failure {
            echo '❌ Deployment failed. Running comprehensive diagnostics...'
            script {
                try {
                    sh '''
                        echo "=== FAILURE DIAGNOSTICS ==="
                        
                        echo "1. Container status:"
                        docker ps -a | grep fm-repo-manager || echo "No fm-repo-manager containers found"
                        
                        echo "2. Development container logs:"
                        docker logs fm-repo-manager-dev --tail 50 2>/dev/null || echo "Dev container logs not available"
                        
                        echo "3. Production container logs:"
                        docker logs fm-repo-manager-prod --tail 50 2>/dev/null || echo "Prod container logs not available"
                        
                        echo "4. Port usage:"
                        netstat -tlnp | grep -E ":(3005|3013)" || echo "No services found on target ports"
                        
                        echo "5. Docker images:"
                        docker images | grep fm-repo-manager || echo "No fm-repo-manager images found"
                        
                        echo "6. System resources:"
                        df -h || echo "Could not check disk space"
                        free -h || echo "Could not check memory"
                        
                        echo "7. Network connectivity test:"
                        curl -f http://localhost:3013/ 2>/dev/null && echo "Dev port accessible" || echo "Dev port not accessible"
                        curl -f http://localhost:3005/ 2>/dev/null && echo "Prod port accessible" || echo "Prod port not accessible"
                    '''
                } catch (Exception e) {
                    echo "❌ Failed to run diagnostics: ${e.getMessage()}"
                }
            }
        }
    }
}


