import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Platform, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

// Expo compatibility
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import { store, persistor } from './store';
import { RootStackParamList } from './types';
import { theme } from './utils/theme';

// Screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import StationDetailScreen from './screens/StationDetailScreen';
import PriceEditorScreen from './screens/PriceEditorScreen';

// Components
import LoadingScreen from './components/LoadingScreen';
import AuthGuard from './components/AuthGuard';

const Stack = createStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  useEffect(() => {
    // Set status bar style for React Native CLI
    if (Platform.OS === 'android' && StatusBar.setBarStyle) {
      StatusBar.setBarStyle('light-content', true);
      StatusBar.setBackgroundColor && StatusBar.setBackgroundColor(theme.colors.primary, true);
    }
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <NavigationContainer>
          {/* Expo StatusBar */}
          <ExpoStatusBar style="light" backgroundColor={theme.colors.primary} />
          
          {/* React Native CLI StatusBar */}
          <StatusBar
            barStyle="light-content"
            backgroundColor={theme.colors.primary}
            translucent={false}
          />
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerStyle: {
                backgroundColor: theme.colors.primary,
              },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 18,
              },
              cardStyle: {
                backgroundColor: theme.colors.background,
              },
            }}
          >
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Dashboard"
              component={AuthGuard(DashboardScreen)}
              options={{
                title: 'FuelPrice Pro',
                headerLeft: () => null, // Disable back button
                gestureEnabled: false, // Disable swipe back
              }}
            />
            <Stack.Screen
              name="StationDetail"
              component={AuthGuard(StationDetailScreen)}
              options={{
                title: 'Station Details',
              }}
            />
            <Stack.Screen
              name="PriceEditor"
              component={AuthGuard(PriceEditorScreen)}
              options={{
                title: 'Update Prices',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;