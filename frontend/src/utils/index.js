/**
 * Utility Functions Index
 * Centralized export of all utility functions
 */

// Form validation utilities
export {
  isValidEmail,
  validatePassword,
  isValidUsername,
  isValidCoordinates,
  isValidUrl,
  isValidPhone,
  passwordsMatch,
  getFieldErrorMessage,
  validateForm,
  sanitizeInput,
  hasFormChanged
} from './formValidation';

// Data formatting utilities
export {
  formatDate,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatCoordinates,
  formatPhoneNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,
  formatNumber,
  truncateText,
  capitalize,
  snakeCaseToTitleCase,
  getStatusColor,
  getRoleBadgeColor
} from './dataFormatting';

// Common helper utilities
export {
  debounce,
  throttle,
  deepClone,
  deepMerge,
  getNestedValue,
  setNestedValue,
  filterBy,
  groupBy,
  sortBy,
  unique,
  arrayDifference,
  arrayIntersection,
  sleep,
  retry,
  isEmpty,
  createQueryString,
  parseQueryString,
  copyToClipboard
} from './commonHelpers';
