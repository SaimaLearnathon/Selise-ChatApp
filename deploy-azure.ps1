$RG_NAME="SeliseChat-India-RG"
$LOCATION="centralindia"
$ENV_NAME="selise-chat-env"

# 1. Register Required Resource Providers
Write-Host "Registering Azure Resource Providers (Microsoft.App, Microsoft.OperationalInsights)..."
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

# 2. Create Resource Group
Write-Host "Creating Resource Group: $RG_NAME in $LOCATION..."
az group create --name $RG_NAME --location $LOCATION

# 3. Create Container App Environment
Write-Host "Creating Container App Environment: $ENV_NAME..."
$envCreateResult = az containerapp env create --name $ENV_NAME --resource-group $RG_NAME --location $LOCATION
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create Container App Environment. Please check if the region '$LOCATION' is allowed for your subscription."
    exit
}

# 4. Deploy Databases (Using TCP transport)
Write-Host "Deploying Databases..."
az containerapp create --name redis --resource-group $RG_NAME --environment $ENV_NAME `
    --image redis:7-alpine --target-port 6379 --ingress internal --transport tcp --min-replicas 1

az containerapp create --name postgres --resource-group $RG_NAME --environment $ENV_NAME `
    --image postgres:16-alpine --target-port 5432 --ingress internal --transport tcp --min-replicas 1 `
    --env-vars POSTGRES_USER=user POSTGRES_PASSWORD=password POSTGRES_DB=authdb

az containerapp create --name mongo --resource-group $RG_NAME --environment $ENV_NAME `
    --image mongo:7 --target-port 27017 --ingress internal --transport tcp --min-replicas 1

# 5. Deploy Backend Services
Write-Host "Deploying Backend Services..."
$NGINX_FQDN = az containerapp show --name nginx --resource-group $RG_NAME --query "properties.configuration.ingress.fqdn" -o tsv
$CORS_URL = "https://$NGINX_FQDN"

az containerapp create --name auth-services --resource-group $RG_NAME --environment $ENV_NAME `
    --image farhanasaima2110047/selise-auth:latest --target-port 4001 --ingress internal --min-replicas 1 `
    --env-vars PORT=4001 NODE_ENV=production REDIS_URL=redis:6379 DATABASE_URL=postgresql://user:password@postgres:5432/authdb?schema=public CORS_ORIGIN=$CORS_URL

az containerapp create --name chat-services --resource-group $RG_NAME --environment $ENV_NAME `
    --image farhanasaima2110047/selise-chat:latest --target-port 4002 --ingress internal --min-replicas 1 `
    --env-vars PORT=4002 NODE_ENV=production REDIS_URL=redis:6379 MONGO_URL=mongodb://mongo:27017/chatapp CLIENT_URL=$CORS_URL

# 6. Deploy Frontend
Write-Host "Deploying Frontend..."
az containerapp create --name frontend --resource-group $RG_NAME --environment $ENV_NAME `
    --image farhanasaima2110047/selise-frontend:latest --target-port 3000 --ingress internal --min-replicas 1 `
    --env-vars NEXT_PUBLIC_AUTH_URL="$CORS_URL/api/auth" NEXT_PUBLIC_SOCKET_URL=$CORS_URL

# 7. Deploy Nginx Proxy (Entry point)
Write-Host "Deploying Nginx Proxy..."
az containerapp create --name nginx --resource-group $RG_NAME --environment $ENV_NAME `
    --image farhanasaima2110047/selise-nginx:latest --target-port 80 --ingress external --min-replicas 1
