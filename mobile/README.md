# FuelPrice Pro Mobile App

A React Native mobile application for remotely managing LED pricing displays at gas stations.

## Features

- **Secure Authentication**: JWT-based authentication with role-based access control
- **Station Dashboard**: View all authorized stations with real-time status indicators
- **Price Management**: Update fuel prices across multiple LED panels simultaneously
- **Real-time Status**: Monitor VPN connectivity and device status
- **Optimized UI**: Large numeric keypad optimized for outdoor/high-glare environments
- **Dark Mode Support**: Automatic dark mode detection and support
- **Offline Handling**: Graceful handling of network connectivity issues

## Architecture

### State Management
- **Redux Toolkit**: Modern Redux with simplified boilerplate
- **Redux Persist**: Automatic state persistence for authentication
- **Async Thunks**: Standardized async action handling

### Navigation
- **React Navigation 6**: Stack-based navigation with TypeScript support
- **Auth Guards**: Protected routes requiring authentication

### API Integration
- **Centralized API Client**: Unified HTTP client with automatic token handling
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Request Timeouts**: Configurable timeouts for network requests

### UI/UX
- **Theme System**: Centralized theming with light/dark mode support
- **Responsive Design**: Optimized for various screen sizes
- **Accessibility**: WCAG-compliant components and navigation

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AuthGuard.tsx   # Authentication protection HOC
│   │   └── LoadingScreen.tsx
│   ├── screens/            # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── StationDetailScreen.tsx
│   │   └── PriceEditorScreen.tsx
│   ├── services/           # API services
│   │   ├── apiClient.ts    # HTTP client
│   │   ├── authService.ts  # Authentication API
│   │   └── stationService.ts # Station management API
│   ├── store/              # Redux store
│   │   ├── index.ts        # Store configuration
│   │   └── slices/         # Redux slices
│   │       ├── authSlice.ts
│   │       └── stationSlice.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/              # Utility functions
│   │   ├── theme.ts        # Theme configuration
│   │   └── formatters.ts   # Data formatting utilities
│   └── App.tsx             # Main app component
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 16 or higher
- React Native development environment
- iOS Simulator (for iOS development)
- Android Studio and emulator (for Android development)

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Install iOS dependencies (iOS only):
```bash
cd ios && pod install && cd ..
```

3. Configure environment:
   - Update API base URL in `src/services/apiClient.ts`
   - Configure app name and bundle ID in platform-specific files

### Running the App

#### iOS
```bash
npm run ios
```

#### Android
```bash
npm run android
```

#### Development Server
```bash
npm start
```

## Configuration

### API Configuration

Update the API base URL in `src/services/apiClient.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Development
  : 'https://your-api.com/api';  // Production
```

### Theme Customization

Modify theme colors in `src/utils/theme.ts`:

```typescript
export const theme: Theme = {
  colors: {
    primary: '#0055ff',  // Primary brand color
    // ... other colors
  },
  // ... spacing, typography
};
```

## Key Features Implementation

### Authentication Flow
1. User enters credentials on login screen
2. App sends credentials to backend API
3. Backend validates and returns JWT token
4. Token is stored securely and used for subsequent requests
5. Auth guard protects routes requiring authentication

### Price Update Flow
1. User selects station from dashboard
2. App fetches current station details and prices
3. User enters new prices with real-time validation
4. App sends price update request to backend
5. Backend validates prices and updates LED panels
6. App shows success/error feedback

### Real-time Status Updates
- Dashboard shows real-time station connectivity status
- Status indicators use color coding (green=online, red=offline)
- Last sync timestamps show when stations were last contacted

## Security Features

- **JWT Token Management**: Secure token storage and automatic refresh
- **Input Validation**: Client-side validation for all user inputs
- **Network Security**: HTTPS-only API communication
- **Session Management**: Automatic logout on token expiration

## Performance Optimizations

- **Redux Persist**: Only persist essential auth state
- **Lazy Loading**: Components loaded on-demand
- **Image Optimization**: Optimized assets for different screen densities
- **Network Caching**: Intelligent caching of API responses

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run linting
npm run lint
```

## Building for Production

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **iOS build issues**: Clean build folder and reinstall pods
3. **Android build issues**: Clean gradle cache and rebuild
4. **Network issues**: Check API URL and network connectivity

### Debug Mode

Enable debug mode by setting `__DEV__` flag:
- Enables detailed logging
- Shows Redux DevTools
- Uses development API endpoints

## Contributing

1. Follow TypeScript strict mode guidelines
2. Use ESLint and Prettier for code formatting
3. Write unit tests for new components
4. Update documentation for new features

## License

This project is proprietary software for FuelPrice Pro system.