import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />
      <Text style={styles.text}>FuelPrice Pro</Text>
      <Text style={styles.subtext}>Simple Test Version</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0055ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    color: 'white',
    fontSize: 16,
  },
});

export default App;