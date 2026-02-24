#!/usr/bin/env pwsh

# Step 1: Fix PostgreSQL Authentication
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Step 1: Fixing PostgreSQL Authentication..." -ForegroundColor Green

$sshCommand = @"
echo 'Checking current database status...' && 
docker ps --format 'table {{.Names}}\t{{.Status}}' && 
echo '' && 
echo 'Checking PostgreSQL users...' && 
docker exec shared-postgres psql -U postgres -c '\du' && 
echo '' && 
echo 'Creating fuelprice_admin user...' && 
docker exec shared-postgres psql -U postgres -c "DROP USER IF EXISTS fuelprice_admin;" && 
docker exec shared-postgres psql -U postgres -c "CREATE USER fuelprice_admin WITH PASSWORD 'Advance1773#';" && 
docker exec shared-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE fuelprice_pro TO fuelprice_admin;" && 
docker exec shared-postgres psql -U postgres -c "ALTER USER fuelprice_admin CREATEDB;" && 
echo '' && 
echo 'Verifying user creation...' && 
docker exec shared-postgres psql -U postgres -c '\du' && 
echo '' && 
echo 'Testing connection with new user...' && 
docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro -c 'SELECT current_user, current_database();' && 
echo '' && 
echo 'Restarting application to use real database...' && 
cd /opt/applications/fuelprice-pro && 
docker-compose -f docker-compose.shared.yml restart fuelprice-app && 
echo 'Waiting for restart...' && 
sleep 30 && 
echo 'Checking application logs...' && 
docker logs fuelprice-app --tail=15
"@

Write-Host "Fixing database authentication..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp $sshCommand

Write-Host ""
Write-Host "Database fix completed!" -ForegroundColor Green