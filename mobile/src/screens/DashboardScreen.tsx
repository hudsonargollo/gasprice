import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { AppDispatch, RootState } from '../store';
import { fetchStations, clearError } from '../store/slices/stationSlice';
import { logoutUser } from '../store/slices/authSlice';
import { Station, RootStackParamList } from '../types';
import { theme } from '../utils/theme';
import { formatStationStatus, formatDate } from '../utils/formatters';
import { useTranslation } from '../locales';
import LoadingScreen from '../components/LoadingScreen';

const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { stations, loading, error, lastUpdated } = useSelector(
    (state: RootState) => state.stations
  );

  useEffect(() => {
    // Load stations when component mounts
    dispatch(fetchStations());
  }, [dispatch]);

  useEffect(() => {
    // Show error alert if fetching fails
    if (error) {
      Alert.alert(t('common.error'), error, [
        { text: t('common.ok'), onPress: () => dispatch(clearError()) },
      ]);
    }
  }, [error, dispatch, t]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchStations());
  }, [dispatch]);

  const handleStationPress = useCallback((stationId: string) => {
    navigation.navigate('StationDetail', { stationId });
  }, [navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('auth.signOut'),
      t('auth.signOutConfirm'),
      [
        { text: t('auth.cancel'), style: 'cancel' },
        {
          text: t('auth.signOut'),
          style: 'destructive',
          onPress: () => dispatch(logoutUser()),
        },
      ]
    );
  }, [dispatch, t]);

  const handleFactoryProvisioning = useCallback(() => {
    navigation.navigate('FactoryProvisioning');
  }, [navigation]);

  const renderStationCard = useCallback(({ item }: { item: Station }) => {
    const statusColor = item.isOnline ? theme.colors.success : theme.colors.error;
    const statusText = formatStationStatus(item.isOnline, item.lastSync);

    return (
      <TouchableOpacity
        style={styles.stationCard}
        onPress={() => handleStationPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.stationHeader}>
          <Text style={styles.stationName}>{item.name}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        </View>
        
        <Text style={styles.statusText}>{statusText}</Text>
        
        {item.location?.address && (
          <Text style={styles.addressText}>{item.location.address}</Text>
        )}
        
        <View style={styles.panelInfo}>
          <Text style={styles.panelCount}>
            {item.panels.length} panel{item.panels.length !== 1 ? 's' : ''}
          </Text>
          {item.lastSync && (
            <Text style={styles.lastSync}>
              Last sync: {formatDate(item.lastSync)}
            </Text>
          )}
        </View>

        {item.panels.length > 0 && (
          <View style={styles.pricePreview}>
            <Text style={styles.priceLabel}>Current Prices:</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceItem}>
                Regular: ${item.panels[0].currentPrices.regular.toFixed(2)}
              </Text>
              <Text style={styles.priceItem}>
                Premium: ${item.panels[0].currentPrices.premium.toFixed(2)}
              </Text>
              <Text style={styles.priceItem}>
                Diesel: ${item.panels[0].currentPrices.diesel.toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleStationPress]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>{t('dashboard.noStations')}</Text>
      <Text style={styles.emptyStateText}>
        {user?.role === 'admin' 
          ? t('dashboard.noStationsAdmin')
          : t('dashboard.noStationsClient')}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
        <Text style={styles.refreshButtonText}>{t('dashboard.refresh')}</Text>
      </TouchableOpacity>
    </View>
  ), [user?.role, handleRefresh, t]);

  if (loading && stations.length === 0) {
    return <LoadingScreen message="Carregando postos..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>{t('dashboard.welcomeBack')}</Text>
          <Text style={styles.usernameText}>{user?.username}</Text>
        </View>
        <View style={styles.headerButtons}>
          {user?.role === 'admin' && (
            <TouchableOpacity style={styles.factoryButton} onPress={handleFactoryProvisioning}>
              <Text style={styles.factoryButtonText}>{t('dashboard.factory')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>{t('auth.signOut')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {lastUpdated && (
        <Text style={styles.lastUpdatedText}>
          {t('dashboard.lastUpdated')} {formatDate(lastUpdated)}
        </Text>
      )}

      <FlatList
        data={stations}
        renderItem={renderStationCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  welcomeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  usernameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factoryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  factoryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  logoutButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  lastUpdatedText: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textSecondary,
    paddingVertical: theme.spacing.sm,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  stationCard: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  addressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  panelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  panelCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  lastSync: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pricePreview: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceItem: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  refreshButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DashboardScreen;