# Firecrawl Deployment Guide for Google Cloud

This guide details the step-by-step process for deploying Firecrawl to Google Cloud Run using Cloud Build and GitHub integration.

## Prerequisites

1. Google Cloud Account with billing enabled
2. GitHub repository with Firecrawl code
3. Google Cloud CLI installed locally
4. Required API Services enabled:
   - Cloud Run API
   - Cloud Build API
   - Secret Manager API
   - Artifact Registry API
   - Redis API

## Initial Setup

### 1. Configure Google Cloud Project

```bash
# Set project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"

# Initialize project
gcloud init
gcloud config set project $PROJECT_ID
```

### 2. Enable Required APIs

```bash
# Enable required services
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    redis.googleapis.com \
    vpcaccess.googleapis.com
```

## Infrastructure Setup

### 1. Create VPC Network

```bash
# Create VPC network
gcloud compute networks create firecrawl-network --subnet-mode=auto

# Create VPC connector
gcloud compute networks vpc-access connectors create firecrawl-connector \
    --network=firecrawl-network \
    --region=$REGION \
    --range=10.8.0.0/28
```

### 2. Create Redis Instance

```bash
# Create Redis instance
gcloud redis instances create firecrawl-redis \
    --size=1 \
    --region=$REGION \
    --network=firecrawl-network \
    --redis-version=redis_7

# Get Redis IP (save this for later)
export REDIS_IP=$(gcloud redis instances describe firecrawl-redis \
    --region=$REGION \
    --format='get(host)')
```

### 3. Create Artifact Registry

```bash
# Create Docker repository
gcloud artifacts repositories create firecrawl-repo \
    --repository-format=docker \
    --location=$REGION
```

## Secret Management

### 1. Create Required Secrets

```bash
# Create secrets for all required environment variables
gcloud secrets create SUPABASE_URL --data-file=- <<< "your-supabase-url"
gcloud secrets create SUPABASE_ANON_TOKEN --data-file=- <<< "your-token"
gcloud secrets create SUPABASE_SERVICE_TOKEN --data-file=- <<< "your-service-token"
gcloud secrets create OPENAI_API_KEY --data-file=- <<< "your-openai-key"
gcloud secrets create PROXY_SERVER --data-file=- <<< "your-proxy-server"
gcloud secrets create PROXY_USERNAME --data-file=- <<< "your-proxy-username"
gcloud secrets create PROXY_PASSWORD --data-file=- <<< "your-proxy-password"
```

## GitHub Integration

### 1. Connect GitHub Repository

1. Go to Google Cloud Console → Cloud Build → Triggers
2. Click "Connect Repository"
3. Select GitHub as source
4. Authenticate with GitHub
5. Select your Firecrawl repository

### 2. Set up Cloud Build Trigger

```bash
# Create Cloud Build trigger
gcloud builds triggers create github \
    --name="firecrawl-deploy" \
    --repo-owner="YOUR_GITHUB_USERNAME" \
    --repo-name="firecrawl" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

### 3. Configure IAM Permissions

```bash
# Get Cloud Build service account
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='get(projectNumber)')
export CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/secretmanager.secretAccessor"
```

## Service Configuration

### 1. Create Service Account for Services

```bash
# Create service account
gcloud iam service-accounts create firecrawl-sa \
    --display-name="Firecrawl Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:firecrawl-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker"
```

### 2. Update Build Variables

After deploying the Playwright service, get its URL:
```bash
export PLAYWRIGHT_URL=$(gcloud run services describe playwright-service \
    --region=$REGION \
    --format='get(status.url)')
```

## Deployment

### 1. Initial Deployment

```bash
# Trigger initial build
gcloud builds submit --config=cloudbuild.yaml \
    --substitutions=_REDIS_IP=$REDIS_IP,_PLAYWRIGHT_URL=$PLAYWRIGHT_URL
```

### 2. Verify Deployment

```bash
# List all services
gcloud run services list

# Check service URLs
gcloud run services describe api-service --format='get(status.url)'
gcloud run services describe playwright-service --format='get(status.url)'
```

## Monitoring Setup

### 1. Create Monitoring Dashboard

```bash
# Create basic dashboard
gcloud monitoring dashboards create \
    --config-from-file=monitoring-dashboard.json
```

### 2. Set up Alerts

```bash
# Create uptime check
gcloud monitoring uptime-check-configs create firecrawl-api \
    --display-name="Firecrawl API" \
    --http-check="$(gcloud run services describe api-service --format='get(status.url)')/health"
```

## Maintenance

### Updating Services

1. Push changes to GitHub main branch
2. Cloud Build automatically triggers deployment
3. Monitor build status:
```bash
gcloud builds list
gcloud builds log $(gcloud builds list --format='get(id)' --limit=1)
```

### Scaling Configuration

```bash
# Configure scaling for services
gcloud run services update api-service \
    --min-instances=1 \
    --max-instances=10

gcloud run services update worker-service \
    --min-instances=1 \
    --max-instances=5

gcloud run services update playwright-service \
    --min-instances=1 \
    --max-instances=10
```

## Troubleshooting

### Viewing Logs

```bash
# View service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=api-service" --limit=50

# View build logs
gcloud builds log $(gcloud builds list --format='get(id)' --limit=1)
```

### Common Issues

1. **VPC Connector Issues**
   - Check VPC connector status
   - Verify network configuration
   - Ensure services are using the connector

2. **Redis Connection Issues**
   - Verify Redis IP is correct
   - Check VPC network settings
   - Verify service account permissions

3. **Build Failures**
   - Check Cloud Build logs
   - Verify Dockerfile configurations
   - Check resource quotas

## Cost Management

Monitor costs using:
```bash
gcloud billing accounts list
gcloud billing projects list
```

Set up budget alerts in Google Cloud Console to avoid unexpected charges.

## Security Considerations

1. Regularly rotate secrets
2. Review IAM permissions
3. Monitor service account usage
4. Enable audit logging
5. Configure firewall rules

## Backup and Recovery

1. Export Redis data regularly
2. Document configuration changes
3. Maintain deployment history
4. Test recovery procedures

For additional support or questions, refer to the project documentation or create an issue on GitHub.
