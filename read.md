# Chat Application – Microservices Architecture

## Overview

This project is a **real-time chat application built with a microservices architecture**.
The system is containerized using **Docker** and deployed using **Kubernetes**.
It supports **horizontal scaling** using Redis for Socket.IO and can be deployed to cloud platforms such as **Azure Kubernetes Service (AKS)**.

The application demonstrates modern DevOps practices including:

* Containerization
* Microservices architecture
* Kubernetes orchestration
* Real-time communication
* Horizontal scaling
* Cloud deployment

---

# Architecture

```
                +------------------+
                |     Frontend     |
                |  (React / Next)  |
                +---------+--------+
                          |
                          |
                     Ingress Controller
                          |
        -----------------------------------------
        |                 |                     |
   Auth Service      Chat Service        Realtime Service
   (JWT login)      (messages API)        (Socket.IO)
        |                 |                     |
        -----------------------------------------
                          |
                        Redis
                (Socket.IO Pub/Sub)
                          |
                        Database
```

---

# Microservices

## 1. Auth Service

Responsible for:

* User login
* User registration
* JWT token generation
* Authentication validation

Example endpoints:

```
POST /login
POST /register
POST /verify
```

Technology:

```
Node.js
Express
JWT
```

---

## 2. Chat Service

Responsible for:

* Storing messages
* Fetching chat history
* Managing conversations

Example endpoints:

```
GET /messages
POST /messages
GET /conversations
```

Technology:

```
Node.js
Express
Database
```

---

## 3. Realtime Service

Handles **real-time messaging using WebSockets**.

Features:

* Socket.IO connections
* Message broadcasting
* Redis adapter for multi-pod communication

Example events:

```
send_message
receive_message
user_join
user_disconnect
```

Technology:

```
Node.js
Socket.IO
Redis Adapter
```

---

# Project Structure

```
chat-app/
│
├── frontend/
│
├── auth-service/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── chat-service/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── realtime-service/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
│
├── k8s/
│   ├── namespace.yaml
│   ├── auth-deployment.yaml
│   ├── chat-deployment.yaml
│   ├── realtime-deployment.yaml
│   ├── redis-deployment.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
│
└── README.md
```

---

# Docker Setup

Each service is containerized using Docker.

Example Dockerfile:

```
FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm","start"]
```

Build images:

```
docker build -t username/auth-service .
docker build -t username/chat-service .
docker build -t username/realtime-service .
```

Push to Docker Hub:

```
docker push username/auth-service
docker push username/chat-service
docker push username/realtime-service
```

---

# Kubernetes Deployment

## Create Namespace

```
kubectl apply -f k8s/namespace.yaml
```

---

## Deploy Services

```
kubectl apply -f k8s/auth-deployment.yaml
kubectl apply -f k8s/chat-deployment.yaml
kubectl apply -f k8s/realtime-deployment.yaml
```

---

## Deploy Redis

Redis is required for **Socket.IO scaling across multiple pods**.

```
kubectl apply -f k8s/redis-deployment.yaml
```

---

## Deploy Ingress

Ingress exposes the application externally and routes traffic.

```
kubectl apply -f k8s/ingress.yaml
```

---

## Horizontal Pod Autoscaling

Autoscaling allows the system to scale automatically when traffic increases.

```
kubectl apply -f k8s/hpa.yaml
```

---

# Running Locally

Install dependencies:

```
npm install
```

Start services:

```
npm run dev
```

Start frontend:

```
npm run dev
```

---

# Environment Variables

Example `.env`

```
PORT=4000
JWT_SECRET=secretkey
REDIS_HOST=redis
REDIS_PORT=6379
CLIENT_URL=http://localhost:3000
```

---

# Deployment to Azure AKS

1. Login to Azure

```
az login
```

2. Create Resource Group

```
az group create --name chatapp-rg --location eastus
```

3. Create AKS Cluster

```
az aks create \
--resource-group chatapp-rg \
--name chatapp-cluster \
--node-count 2 \
--generate-ssh-keys
```

4. Connect kubectl

```
az aks get-credentials \
--resource-group chatapp-rg \
--name chatapp-cluster
```

5. Deploy the application

```
kubectl apply -f k8s/
```

---

# Scaling

The application supports horizontal scaling:

* Multiple backend pods
* Redis adapter for socket synchronization
* Kubernetes HPA for automatic scaling

Example:

```
kubectl scale deployment realtime-service --replicas=5
```

---

# Technologies Used

Frontend

```
React
Next.js
TailwindCSS
```

Backend

```
Node.js
Express
Socket.IO
Redis
JWT
```

DevOps

```
Docker
Kubernetes
Ingress Controller
Horizontal Pod Autoscaler
Azure Kubernetes Service
```

---

# Future Improvements

* Add message queue (Kafka / RabbitMQ)
* Add notification service
* Add file sharing
* Implement rate limiting
* Add monitoring (Prometheus + Grafana)

---

# Author

Farhana Islam Saima
Full Stack Developer

Skills:

```
Next.js
React
Node.js
Docker
Kubernetes
DevOps
```
