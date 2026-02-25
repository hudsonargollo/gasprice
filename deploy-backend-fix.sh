#!/bin/bash

# Shell script to deploy backend fixes to VPS
echo "🚀 Deploying backend fixes to VPS..."

# Build the project locally first to check for errors
echo "📦 Building project locally..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Local build failed. Please fix errors before deploying."
    exit 1
fi

echo "✅ Local build successful. Deploying to VPS..."

# Deploy to VPS
ssh root@vmi3098793.contaboserver.net << 'EOF'
cd /opt/applications/fuelprice-pro
echo "🔄 Pulling latest changes..."
git stash
git pull origin main
echo "📦 Building application..."
npm run build
echo "🔄 Restarting PM2 process..."
pm2 restart fuelprice-backend
echo "📊 Checking PM2 status..."
pm2 status
echo "🏥 Testing health endpoint..."
sleep 3
curl -s https://pricepro.clubemkt.digital/health | head -20
echo ""
echo "🔐 Testing login endpoint..."
curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | head -20
echo ""
echo "✅ Deployment complete!"
EOF

echo "🎉 Backend deployment completed!"
echo "🔗 API URL: https://pricepro.clubemkt.digital"
echo "🔑 Login: admin / admin123"