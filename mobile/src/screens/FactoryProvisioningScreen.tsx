import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { apiClient } from '../services/apiClient';

interface Location {
  stationInfo: {
    name: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
  devices: {
    mikrotik: {
      serialNumber: string;
      macAddress: string;
      model?: string;
    };
    huidu: {
      serialNumber: string;
      macAddress: string;
      model?: string;
    };
  };
  ledPanels: Array<{
    name: string;
  }>;
}

interface ClientInfo {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  itemsPurchased: number;
}

export const FactoryProvisioningScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    itemsPurchased: 1,
  });

  const [locations, setLocations] = useState<Location[]>([
    {
      stationInfo: {
        name: '',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '',
        },
      },
      devices: {
        mikrotik: {
          serialNumber: '',
          macAddress: '',
          model: 'hAP-ac2',
        },
        huidu: {
          serialNumber: '',
          macAddress: '',
          model: 'HD-W60',
        },
      },
      ledPanels: [{ name: 'Main Display' }],
    },
  ]);

  const addLocation = () => {
    setLocations([
      ...locations,
      {
        stationInfo: {
          name: '',
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: '',
          },
        },
        devices: {
          mikrotik: {
            serialNumber: '',
            macAddress: '',
            model: 'hAP-ac2',
          },
          huidu: {
            serialNumber: '',
            macAddress: '',
            model: 'HD-W60',
          },
        },
        ledPanels: [{ name: 'Main Display' }],
      },
    ]);
  };

  const updateLocation = (index: number, field: string, value: any) => {
    const updatedLocations = [...locations];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      (updatedLocations[index] as any)[parent][child] = value;
    } else {
      (updatedLocations[index] as any)[field] = value;
    }
    setLocations(updatedLocations);
  };

  const testDevices = async () => {
    setLoading(true);
    try {
      // Test each location's devices
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        const response = await apiClient.post('/factory/test-devices', {
          mikrotikSerial: location.devices.mikrotik.serialNumber,
          huiduSerial: location.devices.huidu.serialNumber,
        });
        
        if (!response.data.readyForProvisioning) {
          Alert.alert('Device Test Failed', `Location ${i + 1} devices failed testing`);
          return;
        }
      }
      
      Alert.alert('Success', 'All devices tested successfully!');
      setStep(3);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Device testing failed');
    } finally {
      setLoading(false);
    }
  };

  const provisionClient = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/factory/provision', {
        clientInfo,
        locations,
      });

      if (response.data.success) {
        const { client } = response.data;
        Alert.alert(
          'Provisioning Complete!',
          `Client created successfully!\n\nUsername: ${client.username}\nPassword: ${client.password}\n\nCompany: ${client.companyName}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setStep(1);
                setClientInfo({
                  companyName: '',
                  contactName: '',
                  email: '',
                  phone: '',
                  address: '',
                  itemsPurchased: 1,
                });
                setLocations([locations[0]]);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Provisioning failed');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Client Information</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Company Name *"
        value={clientInfo.companyName}
        onChangeText={(text) => setClientInfo({ ...clientInfo, companyName: text })}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contact Name"
        value={clientInfo.contactName}
        onChangeText={(text) => setClientInfo({ ...clientInfo, contactName: text })}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={clientInfo.email}
        onChangeText={(text) => setClientInfo({ ...clientInfo, email: text })}
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={clientInfo.phone}
        onChangeText={(text) => setClientInfo({ ...clientInfo, phone: text })}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={clientInfo.address}
        onChangeText={(text) => setClientInfo({ ...clientInfo, address: text })}
        multiline
      />
      
      <TextInput
        style={styles.input}
        placeholder="Items Purchased"
        value={clientInfo.itemsPurchased.toString()}
        onChangeText={(text) => setClientInfo({ ...clientInfo, itemsPurchased: parseInt(text) || 1 })}
        keyboardType="numeric"
      />
      
      <TouchableOpacity
        style={[styles.button, !clientInfo.companyName && styles.buttonDisabled]}
        onPress={() => setStep(2)}
        disabled={!clientInfo.companyName}
      >
        <Text style={styles.buttonText}>Next: Locations</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Location Setup</Text>
      
      {locations.map((location, index) => (
        <View key={index} style={styles.locationContainer}>
          <Text style={styles.locationTitle}>Location {index + 1}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Station Name *"
            value={location.stationInfo.name}
            onChangeText={(text) => updateLocation(index, 'stationInfo.name', text)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={location.stationInfo.location?.address || ''}
            onChangeText={(text) => updateLocation(index, 'stationInfo.location.address', text)}
          />
          
          <Text style={styles.sectionTitle}>MikroTik Device</Text>
          <TextInput
            style={styles.input}
            placeholder="Serial Number *"
            value={location.devices.mikrotik.serialNumber}
            onChangeText={(text) => updateLocation(index, 'devices.mikrotik.serialNumber', text)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="MAC Address *"
            value={location.devices.mikrotik.macAddress}
            onChangeText={(text) => updateLocation(index, 'devices.mikrotik.macAddress', text)}
          />
          
          <Text style={styles.sectionTitle}>Huidu Device</Text>
          <TextInput
            style={styles.input}
            placeholder="Serial Number *"
            value={location.devices.huidu.serialNumber}
            onChangeText={(text) => updateLocation(index, 'devices.huidu.serialNumber', text)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="MAC Address *"
            value={location.devices.huidu.macAddress}
            onChangeText={(text) => updateLocation(index, 'devices.huidu.macAddress', text)}
          />
        </View>
      ))}
      
      <TouchableOpacity style={styles.addButton} onPress={addLocation}>
        <Text style={styles.addButtonText}>+ Add Another Location</Text>
      </TouchableOpacity>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={testDevices}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Test Devices</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Complete Provisioning</Text>
      
      <Text style={styles.summaryText}>
        Ready to provision {clientInfo.companyName} with {locations.length} location(s).
      </Text>
      
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Summary:</Text>
        <Text>Company: {clientInfo.companyName}</Text>
        <Text>Locations: {locations.length}</Text>
        <Text>Total Devices: {locations.length * 2} (MikroTik + Huidu per location)</Text>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.provisionButton]}
          onPress={provisionClient}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Provisioning</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🏭 Factory Provisioning</Text>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
          <Text style={styles.progressText}>1</Text>
        </View>
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
          <Text style={styles.progressText}>2</Text>
        </View>
        <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
        <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
          <Text style={styles.progressText}>3</Text>
        </View>
      </View>
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStepActive: {
    backgroundColor: '#007bff',
  },
  progressText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  progressLine: {
    width: 50,
    height: 2,
    backgroundColor: '#ddd',
  },
  progressLineActive: {
    backgroundColor: '#007bff',
  },
  stepContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  locationContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#007bff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#666',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  testButton: {
    backgroundColor: '#ffc107',
  },
  provisionButton: {
    backgroundColor: '#28a745',
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
});