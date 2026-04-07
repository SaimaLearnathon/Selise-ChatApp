$RG_NAME="SeliseChat-India-RG"
$LOCATION="centralindia"
$ENV_NAME="selise-chat-env"
$DOCKER_USER="farhanasaima2110047"

# 1. Register Required Resource Providers
Write-Host "Registering Azure Resource Providers..."
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

# 2. Create Resource Group
Write-Host "Creating Resource Group: $RG_NAME..."
az group create --name $RG_NAME --location $LOCATION

# 3. Create Container App Environment
Write-Host "Creating Container App Environment: $ENV_NAME..."
az containerapp env create --name $ENV_NAME --resource-group $RG_NAME --location $LOCATION

# Get environment domain
$ENV_DOMAIN = az containerapp env show --name $ENV_NAME --resource-group $RG_NAME --query "properties.defaultDomain" -o tsv
Write-Host "Environment domain: $ENV_DOMAIN"

# 4. Deploy Databases
Write-Host "Deploying Databases..."
az containerapp create --name redis --resource-group $RG_NAME --environment $ENV_NAME `
    --image redis:7-alpine --target-port 6379 --ingress internal --transport tcp --min-replicas 1

az containerapp create --name postgres --resource-group $RG_NAME --environment $ENV_NAME `
    --image postgres:16-alpine --target-port 5432 --ingress internal --transport tcp --min-replicas 1 `
    --env-vars "POSTGRES_USER=user" "POSTGRES_PASSWORD=password" "POSTGRES_DB=authdb"

az containerapp create --name mongo --resource-group $RG_NAME --environment $ENV_NAME `
    --image mongo:7 --target-port 27017 --ingress internal --transport tcp --min-replicas 1

# Wait for databases to be ready
Write-Host "Waiting 60 seconds for databases to initialize..."
Start-Sleep -Seconds 60

# 5. Deploy Backend Services with correct internal FQDNs
Write-Host "Deploying Backend Services..."
az containerapp create --name auth-services --resource-group $RG_NAME --environment $ENV_NAME `
    --image "$DOCKER_USER/selise-auth:latest" --target-port 4001 --ingress external --min-replicas 1 `
    --env-vars `
    "PORT=4001" `
    "NODE_ENV=production" `
    "DATABASE_URL=postgresql://user:password@postgres.internal.$ENV_DOMAIN:5432/authdb?schema=public" `
    "REDIS_URL=redis://redis.internal.$ENV_DOMAIN:6379" `
    "CORS_ORIGIN=https://frontend.$ENV_DOMAIN" `
    "ACCESS_TOKEN_SECRET=215992c20b94a09211ff4a148d46c54f018e6413ff7b800e3339c501fa741e31" `
    "REFRESH_TOKEN_SECRET=e79607f3ba4c6e3522f84236768e162985f6d7baf4f9e75b964e53592c5c661a" `
    "ACCESS_TOKEN_EXPIRES_IN=15m" `
    "REFRESH_TOKEN_EXPIRES_IN=7d"

az containerapp create --name chat-services --resource-group $RG_NAME --environment $ENV_NAME `
    --image "$DOCKER_USER/selise-chat:latest" --target-port 4002 --ingress external --min-replicas 1 `
    --env-vars `
    "PORT=4002" `
    "NODE_ENV=production" `
    "MONGO_URL=mongodb://mongo.internal.$ENV_DOMAIN:27017/chatapp" `
    "REDIS_URL=redis://redis.internal.$ENV_DOMAIN:6379" `
    "CLIENT_URL=https://frontend.$ENV_DOMAIN" `
    "ACCESS_TOKEN_SECRET=215992c20b94a09211ff4a148d46c54f018e6413ff7b800e3339c501fa741e31"

# 6. Deploy Frontend
Write-Host "Deploying Frontend..."
$AUTH_FQDN = az containerapp show --name auth-services --resource-group $RG_NAME --query "properties.configuration.ingress.fqdn" -o tsv
$CHAT_FQDN = az containerapp show --name chat-services --resource-group $RG_NAME --query "properties.configuration.ingress.fqdn" -o tsv

az containerapp create --name frontend --resource-group $RG_NAME --environment $ENV_NAME `
    --image "$DOCKER_USER/selise-frontend:latest" --target-port 3000 --ingress external --min-replicas 1 `
    --env-vars `
    "NEXT_PUBLIC_AUTH_URL=https://$AUTH_FQDN/api/auth" `
    "NEXT_PUBLIC_SOCKET_URL=https://$CHAT_FQDN"

Write-Host "Deployment complete!"
Write-Host "Frontend: https://frontend.$ENV_DOMAIN"
Write-Host "Auth API: https://auth-services.$ENV_DOMAIN"
Write-Host "Chat API: https://chat-services.$ENV_DOMAIN"