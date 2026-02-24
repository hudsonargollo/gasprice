#!/usr/bin/env pwsh

# Fix PostgreSQL Authentication - Simple approach
param(
    [string]$VpsIp = "62.171.137.90",
    [string]$Username = "root"
)

Write-Host "Fixing PostgreSQL Authentication..." -ForegroundColor Green

Write-Host "Step 1: Dropping existing user..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker exec shared-postgres psql -U postgres -c 'DROP USER IF EXISTS fuelprice_admin;'"

Write-Host "Step 2: Creating new user with correct password..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker exec shared-postgres psql -U postgres -c \"CREATE USER fuelprice_admin WITH PASSWORD 'Advance1773#';\""

Write-Host "Step 3: Granting privileges..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker exec shared-postgres psql -U postgres -c 'GRANT ALL PRIVILEGES ON DATABASE fuelprice_pro TO fuelprice_admin;'"

Write-Host "Step 4: Adding CREATEDB privilege..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker exec shared-postgres psql -U postgres -c 'ALTER USER fuelprice_admin CREATEDB;'"

Write-Host "Step 5: Verifying user creation..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker exec shared-postgres psql -U postgres -c '\du'"

Write-Host "Step 6: Testing connection..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker exec shared-postgres psql -U fuelprice_admin -d fuelprice_pro -c 'SELECT current_user, current_database();'"

Write-Host "Step 7: Restarting application..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "cd /opt/applications/fuelprice-pro && docker-compose -f docker-compose.shared.yml restart fuelprice-app"

Write-Host "Step 8: Waiting for restart..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "Step 9: Checking application logs..." -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no $Username@$VpsIp "docker logs fuelprice-app --tail=15"

Write-Host ""
Write-Host "Database authentication fixed!" -ForegroundColor Green