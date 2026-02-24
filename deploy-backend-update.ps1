# Deploy Backend Update - Factory Provisioning
Write-Host "🚀 Deploying backend update to VPS..." -ForegroundColor Green

# SSH command to update backend
$sshCommand = @"
set -e

echo "📁 Navigating to application directory..."
cd /opt/applications/fuelprice-pro

echo "🔄 Pulling latest code from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building application..."
npm run build

echo "🔄 Restarting application..."
docker-compose -f docker-compose.shared.yml restart fuelprice-app

echo "⏳ Waiting for application to start..."
sleep 30

echo "🧪 Testing factory provisioning endpoints..."
HEALTH_CHECK=`$(curl -s -o /dev/null -w "%{http_code}" https://pricepro.clubemkt.digital/health)

if [ "`$HEALTH_CHECK" = "200" ]; then
    echo "✅ Application is running"
    
    # Test login
    TOKEN=`$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"admin123"}' | \
        grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "`$TOKEN" ]; then
        echo "✅ Admin login successful"
        
        # Test factory provisioning endpoint
        FACTORY_TEST=`$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer `$TOKEN" \
            https://pricepro.clubemkt.digital/api/factory/wizard/steps)
        
        if [ "`$FACTORY_TEST" = "200" ]; then
            echo "✅ Factory provisioning endpoints working"
        else
            echo "❌ Factory provisioning endpoints failed (HTTP `$FACTORY_TEST)"
        fi
    else
        echo "❌ Admin login failed"
    fi
else
    echo "❌ Application health check failed (HTTP `$HEALTH_CHECK)"
fi

echo ""
echo "🎉 BACKEND UPDATE COMPLETED!"
echo "🌐 API: https://pricepro.clubemkt.digital"
echo ""
"@

# Execute SSH command
try {
    Write-Host "Connecting to VPS..." -ForegroundColor Yellow
    ssh root@vmi3098793.contaboserver.net $sshCommand
    Write-Host "✅ Backend deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
}