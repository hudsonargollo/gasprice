import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store';
import { fetchStationDetails, clearError } from '../store/slices/stationSlice';
import { RootStackParamList } from '../types';
import { theme } from '../utils/theme';
import { formatStationStatus, formatDate, formatCurrency } from '../utils/formatters';
import LoadingScreen from '../components/LoadingScreen';

type StationDetailRouteProp = RouteProp<RootStackParamList, 'StationDetail'>;

const StationDetailScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<StationDetailRouteProp>();
  const { stationId } = route.params;

  const { selectedStation, loading, error } = useSelector(
    (state: RootState) => state.stations
  );

  useEffect(() => {
    // Load station details when component mounts
    dispatch(fetchStationDetails(stationId));
  }, [dispatch, stationId]);

  useEffect(() => {
    // Show error alert if fetching fails
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch]);

  const handleEditPrices = useCallback(() => {
    navigation.navigate('PriceEditor', { stationId });
  }, [navigation, stationId]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchStationDetails(stationId));
  }, [dispatch, stationId]);

  if (loading || !selectedStation) {
    return <LoadingScreen message="Loading station details..." />;
  }

  const statusColor = selectedStation.isOnline ? theme.colors.success : theme.colors.error;
  const statusText = formatStationStatus(selectedStation.isOnline, selectedStation.lastSync);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Station Header */}
      <View style={styles.headerCard}>
        <View style={styles.stationHeader}>
          <Text style={styles.stationName}>{selectedStation.name}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        </View>
        
        <Text style={styles.statusText}>{statusText}</Text>
        
        {selectedStation.location?.address && (
          <Text style={styles.addressText}>{selectedStation.location.address}</Text>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>VPN IP:</Text>
          <Text style={styles.infoValue}>{selectedStation.vpnIpAddress}</Text>
        </View>
        
        {selectedStation.lastSync && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Sync:</Text>
            <Text style={styles.infoValue}>{formatDate(selectedStation.lastSync)}</Text>
          </View>
        )}
      </View>

      {/* LED Panels */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>LED Panels ({selectedStation.panels.length})</Text>
        
        {selectedStation.panels.length === 0 ? (
          <Text style={styles.emptyText}>No LED panels configured</Text>
        ) : (
          selectedStation.panels.map((panel) => (
            <View key={panel.id} style={styles.panelCard}>
              <Text style={styles.panelName}>{panel.name}</Text>
              
              <View style={styles.pricesContainer}>
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Regular</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(panel.currentPrices.regular)}
                  </Text>
                </View>
                
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Premium</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(panel.currentPrices.premium)}
                  </Text>
                </View>
                
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Diesel</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(panel.currentPrices.diesel)}
                  </Text>
                </View>
              </View>
              
              {panel.lastUpdate && (
                <Text style={styles.lastUpdateText}>
                  Last updated: {formatDate(panel.lastUpdate)}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleEditPrices}
        >
          <Text style={styles.primaryButtonText}>Update Prices</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleRefresh}
        >
          <Text style={styles.secondaryButtonText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  panelCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  panelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  pricesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  lastUpdateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: theme.spacing.md,
  },
  actionButton: {
    borderRadius: 8,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StationDetailScreen;