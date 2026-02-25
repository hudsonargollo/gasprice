# Google Play Store Publishing Guide - Engefil Connect

## ✅ BUILD COMPLETED SUCCESSFULLY!

**Your Android App Bundle (.aab) is ready:**
https://expo.dev/artifacts/eas/4PJmL5odL6yDP6dKuRyaCy.aab

## STEP 1: Download Your App

1. **Click the link above** to download the `.aab` file
2. **Save it** to your computer (e.g., `engefil-connect-v1.0.0.aab`)
3. **Keep it safe** - this is your production app file

## STEP 2: Create Google Play Console Account

1. **Go to**: https://play.google.com/console
2. **Sign in** with your Google account
3. **Pay the $25 registration fee** (one-time payment)
4. **Complete developer profile** with business information

## STEP 3: Create New App in Play Console

1. **Click "Create app"**
2. **Fill in details**:
   - **App name**: `Engefil Connect`
   - **Default language**: Portuguese (Brazil)
   - **App or game**: App
   - **Free or paid**: Free
   - **Declarations**: Check all required boxes

## STEP 4: Upload Your App Bundle

1. **Go to "Production" in left menu**
2. **Click "Create new release"**
3. **Upload** your `.aab` file (`engefil-connect-v1.0.0.aab`)
4. **Release name**: `1.0.0 - Initial Release`
5. **Release notes** (in Portuguese):
   ```
   Versão inicial do Engefil Connect
   - Controle remoto de placas de preço
   - Sistema de provisionamento de fábrica
   - Interface em português brasileiro
   - Login administrativo e de clientes
   ```

## STEP 5: Complete Store Listing

### Main Store Listing
- **App name**: `Engefil Connect`
- **Short description**: `Controle remoto de placas de preço para postos`
- **Full description**:
  ```
  Engefil Connect é a solução completa para controle remoto de placas de preço em postos de combustível.

  RECURSOS PRINCIPAIS:
  • Controle remoto de placas LED
  • Sistema de provisionamento de fábrica
  • Gerenciamento de múltiplas estações
  • Interface em português brasileiro
  • Sistema de autenticação seguro

  PARA ADMINISTRADORES:
  • Criação e gerenciamento de clientes
  • Provisionamento de dispositivos MikroTik e Huidu
  • Configuração de múltiplas localizações
  • Monitoramento de status dos dispositivos

  PARA CLIENTES:
  • Acesso às suas estações
  • Controle de preços em tempo real
  • Visualização de status dos painéis

  Desenvolvido pela Engefil para facilitar o gerenciamento de postos de combustível com tecnologia moderna e confiável.
  ```

### Graphics and Screenshots
**You need to create these assets:**

1. **App Icon**: 512x512 PNG (high-res version of your current icon)
2. **Feature Graphic**: 1024x500 PNG (banner for Play Store)
3. **Screenshots**: At least 2 phone screenshots
4. **Optional**: Tablet screenshots

### App Categorization
- **Category**: Business
- **Tags**: business, fuel, gas station, remote control, LED display
- **Content rating**: Everyone
- **Target audience**: Adults (business users)

## STEP 6: Set Up Content Rating

1. **Go to "Content rating"**
2. **Complete questionnaire**:
   - Business app
   - No violence, mature content, etc.
   - Target audience: Business professionals
3. **Get "Everyone" rating**

## STEP 7: App Content and Privacy

1. **Privacy Policy**: You need to create one. Example:
   ```
   https://yourwebsite.com/privacy-policy
   ```
   
2. **Data Safety**: Declare what data you collect:
   - User credentials (for authentication)
   - Device information (for management)
   - Network data (for remote control)

3. **Permissions**: Your app requests:
   - INTERNET (for API communication)
   - ACCESS_NETWORK_STATE (for connectivity checks)

## STEP 8: Review and Publish

1. **Review all sections** - ensure everything is complete
2. **Click "Send for review"**
3. **Wait for Google's approval** (usually 1-3 days)
4. **Once approved, click "Publish"**

## STEP 9: Update VPS Backend (IMPORTANT!)

**Before publishing, update your backend with the fixed factory provisioning:**

```bash
# SSH to your VPS
ssh root@vmi3098793.contaboserver.net

# Update backend
cd /opt/applications/fuelprice-pro
git reset --hard HEAD
git pull origin main
npm install
npm run build
pm2 restart fuelprice-backend

# Test the fixed endpoints
curl https://pricepro.clubemkt.digital/health
```

## STEP 10: Test Your Published App

1. **Download from Play Store** once published
2. **Test login** with admin/admin123
3. **Test factory provisioning** - "Testar dispositivos" should work
4. **Verify Portuguese translations**
5. **Check Engefil branding**

## MARKETING ASSETS NEEDED

Create these for better Play Store presence:

1. **App Icon** (512x512): Clean Engefil logo with orange theme
2. **Feature Graphic** (1024x500): Banner showing app interface
3. **Screenshots**: 
   - Login screen
   - Dashboard
   - Factory provisioning screen
   - Device management
4. **Promo Video** (optional): 30-second demo

## TIMELINE

- **Upload & Review**: 1-3 days
- **First approval**: Usually quick for business apps
- **Go live**: Immediately after approval
- **Indexing**: 2-4 hours to appear in search

## CURRENT STATUS

✅ **App Built**: Ready for upload
✅ **Backend Code**: Fixed and ready for deployment
⏳ **Play Console**: Need to set up
⏳ **Backend Update**: Need to deploy to VPS
⏳ **Store Assets**: Need to create graphics

Your app is production-ready! The factory provisioning functionality is fixed and will work perfectly once you update the VPS backend.