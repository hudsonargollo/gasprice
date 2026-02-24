import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store';
import { updateStationPrices, clearError } from '../store/slices/stationSlice';
import { RootStackParamList, FuelPrices } from '../types';
import { theme } from '../utils/theme';
import { validatePrice, parsePrice, formatPrice } from '../utils/formatters';

type PriceEditorRouteProp = RouteProp<RootStackParamList, 'PriceEditor'>;

const PriceEditorScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const route = useRoute<PriceEditorRouteProp>();
  const { stationId } = route.params;

  const { selectedStation, loading, error } = useSelector(
    (state: RootState) => state.stations
  );

  // Price input states
  const [regularPrice, setRegularPrice] = useState('');
  const [premiumPrice, setPremiumPrice] = useState('');
  const [dieselPrice, setDieselPrice] = useState('');

  // Validation states
  const [regularError, setRegularError] = useState('');
  const [premiumError, setPremiumError] = useState('');
  const [dieselError, setDieselError] = useState('');

  useEffect(() => {
    // Initialize prices from current station data
    if (selectedStation && selectedStation.panels.length > 0) {
      const currentPrices = selectedStation.panels[0].currentPrices;
      setRegularPrice(formatPrice(currentPrices.regular));
      setPremiumPrice(formatPrice(currentPrices.premium));
      setDieselPrice(formatPrice(currentPrices.diesel));
    }
  }, [selectedStation]);

  useEffect(() => {
    // Show error alert if update fails
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  const validateInput = useCallback((value: string, setter: (error: string) => void) => {
    const validation = validatePrice(value);
    setter(validation.isValid ? '' : validation.error || '');
    return validation.isValid;
  }, []);

  const handlePriceChange = useCallback((
    value: string,
    setter: (value: string) => void,
    errorSetter: (error: string) => void
  ) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setter(cleaned);
    
    // Clear error when user starts typing
    if (cleaned !== value) {
      errorSetter('');
    }
  }, []);

  const handleBlur = useCallback((
    value: string,
    errorSetter: (error: string) => void
  ) => {
    if (value.trim()) {
      validateInput(value, errorSetter);
    }
  }, [validateInput]);

  const handleUpdatePrices = useCallback(async () => {
    // Validate all inputs
    const isRegularValid = validateInput(regularPrice, setRegularError);
    const isPremiumValid = validateInput(premiumPrice, setPremiumError);
    const isDieselValid = validateInput(dieselPrice, setDieselError);

    if (!isRegularValid || !isPremiumValid || !isDieselValid) {
      Alert.alert('Validation Error', 'Please fix the price validation errors before updating.');
      return;
    }

    const prices: FuelPrices = {
      regular: parsePrice(regularPrice),
      premium: parsePrice(premiumPrice),
      diesel: parsePrice(dieselPrice),
    };

    // Confirm update
    Alert.alert(
      'Update Prices',
      `Are you sure you want to update prices?\n\nRegular: $${formatPrice(prices.regular)}\nPremium: $${formatPrice(prices.premium)}\nDiesel: $${formatPrice(prices.diesel)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const result = await dispatch(updateStationPrices({ stationId, prices }));
              
              if (updateStationPrices.fulfilled.match(result)) {
                Alert.alert(
                  'Success',
                  `Prices updated successfully!\n\n${result.payload.response.panelsUpdated} panel(s) updated.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('Price update error:', error);
            }
          },
        },
      ]
    );
  }, [
    regularPrice,
    premiumPrice,
    dieselPrice,
    stationId,
    dispatch,
    navigation,
    validateInput,
  ]);

  if (!selectedStation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Station not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <Text style={styles.stationName}>{selectedStation.name}</Text>
          <Text style={styles.instructionText}>
            Enter new prices for all LED panels at this station. All panels will be updated simultaneously.
          </Text>
        </View>

        <View style={styles.formCard}>
          {/* Regular Price */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Regular Gasoline</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[
                  styles.priceInput,
                  regularError ? styles.inputError : null,
                ]}
                value={regularPrice}
                onChangeText={(value) => handlePriceChange(value, setRegularPrice, setRegularError)}
                onBlur={() => handleBlur(regularPrice, setRegularError)}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                editable={!loading}
              />
            </View>
            {regularError ? <Text style={styles.errorText}>{regularError}</Text> : null}
          </View>

          {/* Premium Price */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Premium Gasoline</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[
                  styles.priceInput,
                  premiumError ? styles.inputError : null,
                ]}
                value={premiumPrice}
                onChangeText={(value) => handlePriceChange(value, setPremiumPrice, setPremiumError)}
                onBlur={() => handleBlur(premiumPrice, setPremiumError)}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="next"
                editable={!loading}
              />
            </View>
            {premiumError ? <Text style={styles.errorText}>{premiumError}</Text> : null}
          </View>

          {/* Diesel Price */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Diesel</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[
                  styles.priceInput,
                  dieselError ? styles.inputError : null,
                ]}
                value={dieselPrice}
                onChangeText={(value) => handlePriceChange(value, setDieselPrice, setDieselError)}
                onBlur={() => handleBlur(dieselPrice, setDieselError)}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={handleUpdatePrices}
                editable={!loading}
              />
            </View>
            {dieselError ? <Text style={styles.errorText}>{dieselError}</Text> : null}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.updateButton,
              (loading || regularError || premiumError || dieselError) ? styles.updateButtonDisabled : null,
            ]}
            onPress={handleUpdatePrices}
            disabled={loading || !!regularError || !!premiumError || !!dieselError}
          >
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating Prices...' : 'Sync All Panels'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            This will update all {selectedStation.panels.length} LED panel{selectedStation.panels.length !== 1 ? 's' : ''} at this station.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.md,
  },
  headerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingLeft: theme.spacing.md,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    padding: theme.spacing.md,
    textAlign: 'right',
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  actionsContainer: {
    marginTop: theme.spacing.md,
  },
  updateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PriceEditorScreen;