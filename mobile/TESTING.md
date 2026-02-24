# FuelPrice Pro Mobile - Testing Guide

This app supports both **Expo Go** and **React Native CLI** for development and testing.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **Expo CLI**: `npm install -g @expo/cli`
4. **Expo Go app** on your mobile device (from App Store/Google Play)

## Setup

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Testing with Expo Go (Recommended for Quick Testing)

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. This will open Expo DevTools in your browser and show a QR code

3. **On your mobile device:**
   - **iOS**: Open Camera app and scan the QR code
   - **Android**: Open Expo Go app and scan the QR code

4. The app will load on your device through Expo Go

### Expo Go Benefits:
- ✅ Quick setup - no need for Xcode/Android Studio
- ✅ Live reload and hot reloading
- ✅ Works on any device with Expo Go installed
- ✅ Easy sharing with team members

## Testing with React Native CLI (Full Native Features)

If you need full native functionality or custom native modules:

1. **Prerequisites:**
   - **iOS**: Xcode (macOS only)
   - **Android**: Android Studio and Android SDK

2. **Generate native projects** (if not already present):
   ```bash
   npm run prebuild
   ```

3. **Run on iOS** (macOS only):
   ```bash
   npm run ios:cli
   ```

4. **Run on Android**:
   ```bash
   npm run android:cli
   ```

### React Native CLI Benefits:
- ✅ Full access to native APIs
- ✅ Custom native modules
- ✅ Production builds
- ✅ Better performance

## Backend Connection

The mobile app connects to the backend server. Make sure:

1. **Backend is running:**
   ```bash
   # In the root directory
   npm run dev
   ```

2. **Update API endpoint** in `mobile/src/services/apiClient.ts`:
   - For Expo Go: Use your computer's IP address (e.g., `http://192.168.1.100:3000`)
   - For emulators: Use `http://10.0.2.2:3000` (Android) or `http://localhost:3000` (iOS)

## Testing Features

### 1. Authentication
- Test login with demo credentials
- Verify JWT token storage
- Test session persistence

### 2. Station Management
- View station list
- Check real-time status indicators
- Test pull-to-refresh

### 3. Price Updates
- Navigate to price editor
- Test numeric keypad
- Verify price validation
- Test "Sync All" functionality

### 4. Error Handling
- Test offline scenarios
- Verify error messages
- Test network recovery

## Troubleshooting

### Common Issues:

1. **"Network request failed"**
   - Check backend is running
   - Verify API endpoint URL
   - Check device/emulator network connectivity

2. **"Unable to resolve module"**
   - Clear Metro cache: `npx react-native start --reset-cache`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

3. **Expo Go not loading**
   - Ensure device and computer are on same WiFi network
   - Try using tunnel mode: `expo start --tunnel`

4. **Build errors with React Native CLI**
   - Clean builds: `npm run prebuild:clean`
   - For iOS: Clean Xcode build folder
   - For Android: `cd android && ./gradlew clean`

## Development Scripts

```bash
# Expo development
npm start                 # Start Expo dev server
npm run android          # Open on Android via Expo
npm run ios              # Open on iOS via Expo

# React Native CLI
npm run android:cli      # Build and run on Android device/emulator
npm run ios:cli          # Build and run on iOS device/simulator

# Utilities
npm run prebuild         # Generate native projects
npm run prebuild:clean   # Clean and regenerate native projects
npm test                 # Run tests
npm run lint             # Run ESLint
```

## Next Steps

1. **Add real assets** - Replace placeholder icons and splash screens
2. **Configure push notifications** - Add Expo notifications if needed
3. **Set up app signing** - For production builds
4. **Add crash reporting** - Consider Sentry or Bugsnag
5. **Performance monitoring** - Add analytics and performance tracking