pipeline {
    agent any

    environment {
        IMAGE_NAME = 'fm-repo-manager'
        CONTAINER_NAME = 'fm-repo-manager'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'ls -la'
            }
        }

        stage('Build Production Docker Image') {
            steps {
                echo "Building PRODUCTION Docker image ${env.IMAGE_NAME} using Dockerfile.production..."
                sh "docker build -f Dockerfile.production -t ${env.IMAGE_NAME} ."
            }
        }

        stage('Deploy Docker Container') {
            steps {
                echo "Deploying container ${env.CONTAINER_NAME} with production image..."

                sh "docker stop ${env.CONTAINER_NAME} || true"
                sh "docker rm ${env.CONTAINER_NAME} || true"

                sh """
                    docker run -d \
                        --name "${env.CONTAINER_NAME}" \
                        -p 3005:80 \
                        -e NODE_ENV=production \
                        --restart unless-stopped \
                        "${env.IMAGE_NAME}"
                """
                echo "Container ${env.CONTAINER_NAME} started with production image, mapped to host port 3005 from container port 80."
            }
        }

        stage('Verify Deployment') {
            steps {
                sleep 15
                echo "Verifying container status..."
                sh "docker ps -f name=${env.CONTAINER_NAME}"
                echo "Verifying application health (Nginx should serve on port 80 inside, mapped to 3005 on host)..."
                sh "curl -f http://localhost:3005/ || exit 1"
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Deployment failed.'
        }
    }
}


