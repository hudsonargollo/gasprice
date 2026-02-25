# PowerShell script to deploy backend fixes to VPS
Write-Host "🚀 Deploying backend fixes to VPS..." -ForegroundColor Green

# Build the project locally first to check for errors
Write-Host "📦 Building project locally..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Local build failed. Please fix errors before deploying." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Local build successful. Deploying to VPS..." -ForegroundColor Green

# Deploy to VPS
ssh root@vmi3098793.contaboserver.net @"
cd /opt/applications/fuelprice-pro
echo '🔄 Pulling latest changes...'
git stash
git pull origin main
echo '📦 Building application...'
npm run build
echo '🔄 Restarting PM2 process...'
pm2 restart fuelprice-backend
echo '📊 Checking PM2 status...'
pm2 status
echo '🏥 Testing health endpoint...'
sleep 3
curl -s https://pricepro.clubemkt.digital/health | head -20
echo ''
echo '🔐 Testing login endpoint...'
curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"username\":\"admin\",\"password\":\"admin123\"}' | head -20
echo ''
echo '✅ Deployment complete!'
"@

Write-Host "🎉 Backend deployment completed!" -ForegroundColor Green
Write-Host "🔗 API URL: https://pricepro.clubemkt.digital" -ForegroundColor Cyan
Write-Host "🔑 Login: admin / admin123" -ForegroundColor Cyan