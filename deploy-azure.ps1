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

# 4. Deploy Databases (Using Internal TCP transport)
Write-Host "Deploying Databases..."
az containerapp create --name redis --resource-group $RG_NAME --environment $ENV_NAME `
    --image redis:7-alpine --target-port 6379 --ingress internal --transport tcp --min-replicas 1

az containerapp create --name postgres --resource-group $RG_NAME --environment $ENV_NAME `
    --image postgres:16-alpine --target-port 5432 --ingress internal --transport tcp --min-replicas 1 `
    --env-vars POSTGRES_USER=user POSTGRES_PASSWORD=password POSTGRES_DB=authdb

az containerapp create --name mongo --resource-group $RG_NAME --environment $ENV_NAME `
    --image mongo:7 --target-port 27017 --ingress internal --transport tcp --min-replicas 1

# 5. Deploy Backend Services (Direct External Ingress)
Write-Host "Deploying Backend Services..."
az containerapp create --name auth-services --resource-group $RG_NAME --environment $ENV_NAME `
    --image $DOCKER_USER/selise-auth:latest --target-port 4001 --ingress external --min-replicas 1 `
    --env-vars PORT=4001 NODE_ENV=production REDIS_URL=redis:6379 DATABASE_URL=postgresql://user:password@postgres:5432/authdb?schema=public

az containerapp create --name chat-services --resource-group $RG_NAME --environment $ENV_NAME `
    --image $DOCKER_USER/selise-chat:latest --target-port 4002 --ingress external --min-replicas 1 `
    --env-vars PORT=4002 NODE_ENV=production REDIS_URL=redis:6379 MONGO_URL=mongodb://mongo:27017/chatapp

# 6. Deploy Frontend
Write-Host "Deploying Frontend..."
$AUTH_FQDN = az containerapp show --name auth-services --resource-group $RG_NAME --query "properties.configuration.ingress.fqdn" -o tsv
$CHAT_FQDN = az containerapp show --name chat-services --resource-group $RG_NAME --query "properties.configuration.ingress.fqdn" -o tsv

az containerapp create --name frontend --resource-group $RG_NAME --environment $ENV_NAME `
    --image $DOCKER_USER/selise-frontend:latest --target-port 3000 --ingress external --min-replicas 1 `
    --env-vars NEXT_PUBLIC_AUTH_URL="https://$AUTH_FQDN/api/auth" NEXT_PUBLIC_SOCKET_URL="https://$CHAT_FQDN"
