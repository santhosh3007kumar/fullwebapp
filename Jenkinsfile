pipeline {
    agent any

    tools {
        nodejs 'nodejs'
    }

    environment {
        AWS_ACCOUNT_ID = "352311919031"
        AWS_REGION = "ap-southeast-1"
        ECR_FRONTEND = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/frontend-repo"
        ECR_BACKEND  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/backend-repo"
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                     url: 'https://github.com/santhosh3007kumar/fullwebapp.git'
                sh 'ls -la'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Frontend Install') {
                    steps {
                        dir('frontend') {
                            sh 'npm install'
                        }
                    }
                }
                stage('Backend Install') {
                    steps {
                        dir('backend') {
                            sh 'npm install'
                        }
                    }
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                docker build -t frontend:${IMAGE_TAG} ./frontend
                docker build -t backend:${IMAGE_TAG} ./backend
                '''
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL frontend:${IMAGE_TAG}

                docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \\
                aquasec/trivy image --exit-code 0 --severity HIGH,CRITICAL backend:${IMAGE_TAG}
                '''
            }
        }

        stage('Login to AWS ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-jenkin-creds'
                ]]) {
                    sh '''
                    aws ecr get-login-password --region ${AWS_REGION} | \\
                    docker login --username AWS --password-stdin \\
                    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                    '''
                }
            }
        }

        stage('Tag Docker Images') {
            steps {
                sh '''
                docker tag frontend:${IMAGE_TAG} ${ECR_FRONTEND}:${IMAGE_TAG}
                docker tag backend:${IMAGE_TAG} ${ECR_BACKEND}:${IMAGE_TAG}
                '''
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                docker push ${ECR_FRONTEND}:${IMAGE_TAG}
                docker push ${ECR_BACKEND}:${IMAGE_TAG}
                '''
            }
        }

        stage('Deploy to EKS using Helm') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-jenkin-cred'
                ]]) {
                    sh '''
                    aws eks update-kubeconfig \\
                    --region ${AWS_REGION} \\
                    --name devops-cluster

                    helm upgrade --install fullstack ./helm/fullstack-chart \\
                      --set frontend.image.repository=${ECR_FRONTEND} \\
                      --set frontend.image.tag=${IMAGE_TAG} \\
                      --set backend.image.repository=${ECR_BACKEND} \\
                      --set backend.image.tag=${IMAGE_TAG} \\
                      --namespace production \\
                      --create-namespace \\
                      --wait --timeout=5m
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "🚀 Deployment Successful"
            sh '''
            kubectl get pods -n production
            kubectl get svc -n production
            '''
        }
        failure {
            echo "❌ Pipeline Failed"
        }
        always {
            sh 'docker system prune -f'
        }
    }
}
