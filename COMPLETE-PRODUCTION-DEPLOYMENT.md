# Complete Production Deployment & Google Play Store Publishing

## Phase 1: Backend Production Deployment

### 1. Update VPS Backend
```bash
# SSH to VPS
ssh root@vmi3098793.contaboserver.net

# Navigate to app directory
cd /opt/applications/fuelprice-pro

# Resolve git conflicts and update
git reset --hard HEAD
git pull origin main

# Install dependencies and build
npm install
npm run build

# Restart application
pm2 restart fuelprice-backend || pm2 start dist/index.js --name fuelprice-backend

# Verify deployment
pm2 status
curl https://pricepro.clubemkt.digital/health

# Test factory provisioning endpoints
TOKEN=$(curl -s -X POST https://pricepro.clubemkt.digital/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -H "Authorization: Bearer $TOKEN" \
  https://pricepro.clubemkt.digital/api/factory/wizard/steps

curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mikrotikSerial":"TEST123","huiduSerial":"TEST456"}' \
  https://pricepro.clubemkt.digital/api/factory/test-devices
```

## Phase 2: Mobile App Production Build

### 1. Verify EAS Configuration
The app is already configured for Google Play Store:
- ✅ Package name: `com.engefil.connect`
- ✅ App name: `Engefil Connect`
- ✅ Version: `1.0.0`
- ✅ Portuguese localization
- ✅ Engefil branding (orange theme)

### 2. Build for Google Play Store
```bash
# Navigate to mobile directory
cd mobile

# Install EAS CLI (if not installed)
npm install -g @expo/eas-cli

# Login to Expo account
eas login

# Configure project (if needed)
eas build:configure

# Build for Android (Google Play Store)
eas build --platform android --profile production

# Alternative: Build APK for testing
eas build --platform android --profile preview
```

### 3. Submit to Google Play Store
```bash
# Submit to Google Play Store (after build completes)
eas submit --platform android
```

## Phase 3: Production Verification

### Backend Verification:
- [ ] Health endpoint: https://pricepro.clubemkt.digital/health
- [ ] Admin login works
- [ ] Factory provisioning endpoints respond
- [ ] Database connections stable
- [ ] SSL certificate valid

### Mobile App Verification:
- [ ] App builds successfully
- [ ] Login with admin/admin123 works
- [ ] Factory provisioning screen loads
- [ ] "Testar dispositivos" works (no more "route not found")
- [ ] Portuguese translations display correctly
- [ ] Engefil branding appears correctly

## Phase 4: Google Play Store Requirements

### App Store Listing:
- **App Name**: Engefil Connect
- **Description**: Controle remoto de placas de preço para postos de combustível
- **Category**: Business/Productivity
- **Target Audience**: Business users
- **Content Rating**: Everyone

### Required Assets:
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (phone + tablet)
- [ ] Privacy policy URL
- [ ] App description in Portuguese

### Technical Requirements:
- [ ] Target API level 34 (Android 14)
- [ ] 64-bit architecture support
- [ ] App signing by Google Play
- [ ] Permissions justified

## Current Status:
✅ Backend code fixed and ready for deployment
✅ Mobile app configured for production
✅ EAS build configuration ready
✅ Portuguese localization complete
✅ Engefil branding implemented
⏳ Awaiting VPS backend update
⏳ Awaiting mobile app build

## Next Steps:
1. Update VPS backend (run commands from Phase 1)
2. Build mobile app for production (run commands from Phase 2)
3. Test complete system end-to-end
4. Submit to Google Play Store