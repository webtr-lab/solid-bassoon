/**
 * Data Formatting Utilities
 * Reusable functions for formatting and transforming data
 */

/**
 * Format date to locale string
 * @param {string|Date} dateString - Date string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return dateString;

    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch {
    return dateString;
  }
};

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1h 30m")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && hours === 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
};

/**
 * Format distance in kilometers
 * @param {number} km - Distance in kilometers
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted distance
 */
export const formatDistance = (km, decimals = 2) => {
  if (!km || km === 0) return '0 km';
  return `${parseFloat(km).toFixed(decimals)} km`;
};

/**
 * Format speed in km/h
 * @param {number} speed - Speed in km/h
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted speed
 */
export const formatSpeed = (speed, decimals = 1) => {
  if (!speed || speed === 0) return '0 km/h';
  return `${parseFloat(speed).toFixed(decimals)} km/h`;
};

/**
 * Format coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted coordinates
 */
export const formatCoordinates = (latitude, longitude, decimals = 4) => {
  if (!latitude || !longitude) return '';
  return `${parseFloat(latitude).toFixed(decimals)}, ${parseFloat(longitude).toFixed(decimals)}`;
};

/**
 * Format phone number
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';

  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  return phone;
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (!amount && amount !== 0) return '';

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch {
    return amount;
  }
};

/**
 * Format percentage
 * @param {number} value - Decimal value (0-1)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (!value && value !== 0) return '0%';
  return `${(parseFloat(value) * 100).toFixed(decimals)}%`;
};

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, index)).toFixed(2);

  return `${size} ${units[index]}`;
};

/**
 * Format number with thousand separators
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (num, decimals = 0) => {
  if (!num && num !== 0) return '';

  return parseFloat(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Truncate string with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Capitalize first letter
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Convert snake_case to title case
 * @param {string} text - Snake case text
 * @returns {string} Title case text
 */
export const snakeCaseToTitleCase = (text) => {
  if (!text) return '';
  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Format status badge color
 * @param {string} status - Status value
 * @returns {object} CSS classes for badge
 */
export const getStatusColor = (status) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    online: 'bg-green-100 text-green-800',
    offline: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    default: 'bg-gray-100 text-gray-800'
  };

  return statusColors[status] || statusColors.default;
};

/**
 * Get role badge color
 * @param {string} role - User role
 * @returns {object} CSS classes for badge
 */
export const getRoleBadgeColor = (role) => {
  const roleColors = {
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    operator: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800',
    default: 'bg-gray-100 text-gray-800'
  };

  return roleColors[role] || roleColors.default;
};
