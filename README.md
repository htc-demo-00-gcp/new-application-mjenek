# To-Do App - Google Cloud Storage Demo

A comprehensive demo application showcasing how a platform orchestrator enables access to Google Cloud Storage via Kubernetes pod service accounts using Workload Identity.

## 🏗️ Architecture

This application demonstrates:

- **Backend**: Go REST API with dual storage backends:
  - **Local Development**: In-memory storage for easy testing
  - **Production**: Google Cloud Storage bucket accessed via pod ServiceAccount
- **Frontend**: React application with Tailwind CSS and shadcn/ui components
- **Storage**: Configurable storage backend (in-memory or GCS)
- **Security**: Workload Identity for secure, credential-free access
- **Deployment**: Kubernetes-native deployment with Helm charts

## 🚀 Features

- **CRUD Operations**: Create, read, update, and delete tasks
- **Dual Storage Backends**: 
  - In-memory storage for local development
  - Google Cloud Storage for production
- **Smart Backend Selection**: Automatically chooses storage based on environment
- **Health Checks**: Built-in health monitoring endpoints

## 📋 Prerequisites

- Docker and Docker Compose
- Go 1.21+ (for local backend development)
- Node.js 18+ (for local frontend development)
- Kubernetes cluster with Workload Identity enabled
- Google Cloud Storage bucket
- Helm 3.0+

## 🏃‍♂️ Running Locally

### 1. Clone and Setup

```bash
git clone <repository-url>
cd new-application-mjenek
```

### 2. Environment Configuration

Copy the environment file and configure your storage backend:

```bash
cp env.example .env
# For local development (recommended):
# USE_LOCAL_STORAGE=true (already set in .env)

# For GCS testing:
# USE_LOCAL_STORAGE=false
# BUCKET_NAME=your-actual-bucket-name
```

### 3. Backend Development

```bash
cd backend
go mod download
go run main.go
```

The backend will start on `http://localhost:8080` with **in-memory storage** by default

### 4. Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

### 5. Docker Compose (Recommended)

For a complete local environment with in-memory storage:

```bash
# Build and start services
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8080

# The backend automatically uses in-memory storage for local development
# No GCS bucket setup required!
```

## 🚢 Deploying with Helm

### 1. Build and Push Images

```bash
# Backend
docker build -t your-registry/todo-backend:latest ./backend
docker push your-registry/todo-backend:latest

# Frontend
docker build -t your-registry/todo-frontend:latest ./frontend
docker push your-registry/todo-frontend:latest
```

### 2. Deploy to Kubernetes

```bash
# Install the Helm chart
helm install todo-app ./helm/todo-app \
  --set image.backend.repository=your-registry/todo-backend \
  --set image.frontend.repository=your-registry/todo-frontend \
  --set bucketName=my-demo-bucket \
  --set service.type=LoadBalancer \
  --set serviceAccount.name=my-gcs-serviceaccount

# Or use a values file
helm install todo-app ./helm/todo-app -f custom-values.yaml
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -l app.kubernetes.io/name=todo-app

# Check services
kubectl get svc -l app.kubernetes.io/name=todo-app

# Check logs
kubectl logs -l app.kubernetes.io/component=backend
```

### 4. Pipeline Configuration

The GitHub Actions pipelines automatically configure all necessary values:

```yaml
# Pipeline automatically sets these values:
--set image.backend.repository=europe-west3-docker.pkg.dev/htc-demo-00-gcp/humanitec/todo-backend
--set image.backend.tag=${{ github.sha }}
--set image.frontend.repository=europe-west3-docker.pkg.dev/htc-demo-00-gcp/humanitec/todo-frontend
--set image.frontend.tag=${{ github.sha }}
--set backend.env.BUCKET_NAME=${{ steps.parse_yaml.outputs.bucket-name }}
--set serviceAccount.name=${{ steps.parse_yaml.outputs.service-account }}
--set service.type=LoadBalancer
```

## 🙏 Acknowledgments

- [Google Cloud Storage Go Client](https://cloud.google.com/go/docs/storage)
- [Gorilla Mux](https://github.com/gorilla/mux)
- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Helm](https://helm.sh/)
