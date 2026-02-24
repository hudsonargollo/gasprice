/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  return price.toFixed(2);
};

/**
 * Format currency with symbol
 */
export const formatCurrency = (price: number, symbol: string = '$'): string => {
  return `${symbol}${formatPrice(price)}`;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

/**
 * Format time for display
 */
export const formatTime = (dateString: string | null): string => {
  if (!dateString) return '--:--';
  
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format station status
 */
export const formatStationStatus = (isOnline: boolean, lastSync: string | null): string => {
  if (!isOnline) return 'Offline';
  if (!lastSync) return 'Online';
  
  const lastSyncDate = new Date(lastSync);
  const now = new Date();
  const diffMs = now.getTime() - lastSyncDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 5) return 'Online';
  if (diffMins < 60) return `Online (${diffMins}m ago)`;
  
  return 'Connection issues';
};

/**
 * Validate price input
 */
export const validatePrice = (value: string): { isValid: boolean; error?: string } => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Price is required' };
  }

  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Invalid price format' };
  }

  if (numValue <= 0) {
    return { isValid: false, error: 'Price must be greater than 0' };
  }

  if (numValue < 0.01) {
    return { isValid: false, error: 'Price must be at least $0.01' };
  }

  if (numValue > 999.99) {
    return { isValid: false, error: 'Price cannot exceed $999.99' };
  }

  // Check decimal places
  const decimalPlaces = (value.split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { isValid: false, error: 'Price cannot have more than 2 decimal places' };
  }

  return { isValid: true };
};

/**
 * Parse price input
 */
export const parsePrice = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

/**
 * Format fuel type name for display
 */
export const formatFuelType = (fuelType: string): string => {
  return fuelType.charAt(0).toUpperCase() + fuelType.slice(1).toLowerCase();
};

/**
 * Get status color based on online status
 */
export const getStatusColor = (isOnline: boolean): string => {
  return isOnline ? '#28a745' : '#dc3545';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};