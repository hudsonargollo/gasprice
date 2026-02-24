# Multi-Application VPS Deployment Guide

This guide will help you deploy FuelPrice Pro along with other applications (n8n, Gowa, etc.) on a single VPS using shared infrastructure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Your VPS                            │
├─────────────────────────────────────────────────────────────┤
│  Traefik (Reverse Proxy + SSL)                             │
│  ├── fuelprice.yourdomain.com → FuelPrice Pro              │
│  ├── n8n.yourdomain.com → n8n                              │
│  └── gowa.yourdomain.com → Gowa                            │
├─────────────────────────────────────────────────────────────┤
│  Shared Infrastructure                                      │
│  ├── PostgreSQL (shared by all apps)                       │
│  │   ├── fuelprice_pro database                            │
│  │   ├── n8n database                                      │
│  │   └── gowa database                                     │
│  └── Redis (shared cache/queue)                            │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- VPS with Ubuntu 20.04+ (2GB RAM minimum, 4GB recommended)
- Domain name with DNS pointing to your VPS IP
- SSH access to your VPS

## Step 1: Initial VPS Setup

1. **Upload the deployment files to your VPS:**
```bash
# On your local machine
scp -r . user@YOUR_VPS_IP:/tmp/fuelprice-deployment/
```

2. **SSH into your VPS:**
```bash
ssh user@YOUR_VPS_IP
```

3. **Move files and run the multi-app setup:**
```bash
sudo mv /tmp/fuelprice-deployment /opt/fuelprice-deployment
cd /opt/fuelprice-deployment
chmod +x deploy/multi-app-setup.sh
./deploy/multi-app-setup.sh
```

## Step 2: Configure Shared Infrastructure

1. **Configure the shared infrastructure environment:**
```bash
cd /opt/shared-infrastructure
cp .env.template .env
nano .env
```

2. **Update the .env file with your values:**
```bash
# Domain Configuration
DOMAIN=yourdomain.com
ACME_EMAIL=your-email@yourdomain.com

# PostgreSQL Configuration
POSTGRES_ROOT_PASSWORD=your_super_secure_postgres_root_password
FUELPRICE_DB_PASSWORD=your_secure_fuelprice_db_password
N8N_DB_PASSWORD=your_secure_n8n_db_password
GOWA_DB_PASSWORD=your_secure_gowa_db_password

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password
```

3. **Update the database initialization script with your passwords:**
```bash
cd /opt/shared-infrastructure
sed -i 's/FUELPRICE_DB_PASSWORD_PLACEHOLDER/your_secure_fuelprice_db_password/g' postgres/init/01-create-databases.sql
sed -i 's/N8N_DB_PASSWORD_PLACEHOLDER/your_secure_n8n_db_password/g' postgres/init/01-create-databases.sql
sed -i 's/GOWA_DB_PASSWORD_PLACEHOLDER/your_secure_gowa_db_password/g' postgres/init/01-create-databases.sql
```

4. **Start the shared infrastructure:**
```bash
sudo systemctl start shared-infrastructure
sudo systemctl status shared-infrastructure
```

## Step 3: Deploy FuelPrice Pro

1. **Run the FuelPrice Pro deployment script:**
```bash
cd /opt/fuelprice-deployment
chmod +x deploy/deploy-fuelprice.sh
./deploy/deploy-fuelprice.sh
```

2. **Configure FuelPrice Pro environment:**
```bash
cd /opt/applications/fuelprice-pro
nano .env
```

Update these values:
```bash
FUELPRICE_DB_PASSWORD=your_secure_fuelprice_db_password
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
DOMAIN=yourdomain.com
```

3. **Restart FuelPrice Pro:**
```bash
sudo systemctl restart fuelprice-pro
```

## Step 4: Deploy Additional Applications

### Deploy n8n:

1. **Create n8n application directory:**
```bash
mkdir -p /opt/applications/n8n
cd /opt/applications/n8n
```

2. **Copy the n8n compose file:**
```bash
cp /opt/fuelprice-deployment/deploy/example-n8n-compose.yml docker-compose.yml
```

3. **Create n8n environment file:**
```bash
cat > .env << EOF
DOMAIN=yourdomain.com
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_secure_n8n_password
N8N_DB_PASSWORD=your_secure_n8n_db_password
REDIS_PASSWORD=your_secure_redis_password
EOF
```

4. **Start n8n:**
```bash
docker-compose up -d
```

### Deploy Gowa (similar process):

1. **Create Gowa application directory:**
```bash
mkdir -p /opt/applications/gowa
cd /opt/applications/gowa
```

2. **Copy and configure Gowa compose file:**
```bash
cp /opt/fuelprice-deployment/deploy/example-gowa-compose.yml docker-compose.yml
# Edit the compose file with the correct Gowa image and configuration
```

## Step 5: Configure DNS

Point your domain and subdomains to your VPS IP:

```
A    yourdomain.com           → YOUR_VPS_IP
A    fuelprice.yourdomain.com → YOUR_VPS_IP
A    n8n.yourdomain.com       → YOUR_VPS_IP
A    gowa.yourdomain.com      → YOUR_VPS_IP
A    traefik.yourdomain.com   → YOUR_VPS_IP
```

## Step 6: Verify Deployment

1. **Check all services are running:**
```bash
docker ps
sudo systemctl status shared-infrastructure
sudo systemctl status fuelprice-pro
```

2. **Check logs:**
```bash
# Shared infrastructure logs
cd /opt/shared-infrastructure && docker-compose logs -f

# FuelPrice Pro logs
cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs -f
```

3. **Test applications:**
- FuelPrice Pro: https://fuelprice.yourdomain.com
- n8n: https://n8n.yourdomain.com
- Traefik Dashboard: https://traefik.yourdomain.com

## Step 7: Update Mobile App

Update the mobile app's API endpoint:

```typescript
// mobile/src/services/apiClient.ts
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.3:3000/api' // Development
  : 'https://fuelprice.yourdomain.com/api'; // Production
```

## Maintenance Commands

### View all running containers:
```bash
docker ps
```

### Check database:
```bash
docker exec -it shared-postgres psql -U postgres
\l  # List databases
\c fuelprice_pro  # Connect to FuelPrice Pro database
\dt  # List tables
```

### Backup database:
```bash
docker exec shared-postgres pg_dump -U postgres fuelprice_pro > fuelprice_backup.sql
```

### View logs:
```bash
# All infrastructure logs
cd /opt/shared-infrastructure && docker-compose logs -f

# Specific application logs
cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs -f
```

### Restart services:
```bash
sudo systemctl restart shared-infrastructure
sudo systemctl restart fuelprice-pro
```

## Security Notes

1. **Firewall is configured** to only allow SSH, HTTP, and HTTPS
2. **Fail2ban is installed** to prevent brute force attacks
3. **SSL certificates** are automatically managed by Traefik
4. **Database passwords** should be strong and unique
5. **Regular backups** should be scheduled

## Troubleshooting

### If services won't start:
```bash
# Check Docker daemon
sudo systemctl status docker

# Check shared infrastructure
sudo systemctl status shared-infrastructure
cd /opt/shared-infrastructure && docker-compose logs

# Check individual applications
sudo systemctl status fuelprice-pro
cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml logs
```

### If SSL certificates fail:
```bash
# Check Traefik logs
docker logs traefik

# Verify DNS is pointing to your server
nslookup fuelprice.yourdomain.com
```

### If database connection fails:
```bash
# Check PostgreSQL is running
docker exec -it shared-postgres pg_isready

# Test connection
docker exec -it shared-postgres psql -U fuelprice_admin -d fuelprice_pro
```

## Adding More Applications

To add more applications:

1. Create a new directory in `/opt/applications/`
2. Create a `docker-compose.yml` that uses the `shared-infrastructure_shared-network`
3. Configure Traefik labels for routing
4. Add database and user to the shared PostgreSQL if needed
5. Start the application

The shared infrastructure approach allows you to efficiently run multiple applications while sharing resources like PostgreSQL, Redis, and SSL certificates.