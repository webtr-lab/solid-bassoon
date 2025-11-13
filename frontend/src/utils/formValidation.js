/**
 * Form Validation Utilities
 * Reusable validation functions for form fields
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and errors array
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (password && !/[A-Z]/.test(password)) {
    errors.push('Password should contain an uppercase letter');
  }

  if (password && !/[0-9]/.test(password)) {
    errors.push('Password should contain a number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username format
 */
export const isValidUsername = (username) => {
  if (!username) return false;
  if (username.length < 3) return false;
  if (username.length > 50) return false;
  // Allow alphanumeric, underscore, hyphen
  return /^[a-zA-Z0-9_-]+$/.test(username);
};

/**
 * Validate coordinates (latitude/longitude)
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} True if valid coordinates
 */
export const isValidCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;

  return true;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 */
export const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  // Basic validation: allow digits, spaces, hyphens, parentheses, plus
  const phoneRegex = /^[\d\s\-\(\)\+]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
};

/**
 * Compare two passwords
 * @param {string} password1 - First password
 * @param {string} password2 - Second password
 * @returns {boolean} True if passwords match
 */
export const passwordsMatch = (password1, password2) => {
  return password1 === password2 && password1.length > 0;
};

/**
 * Get form field error message
 * @param {string} fieldName - Name of the field
 * @param {string} errorType - Type of error (required, invalid, etc.)
 * @returns {string} User-friendly error message
 */
export const getFieldErrorMessage = (fieldName, errorType = 'required') => {
  const fieldLabel = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');

  const errors = {
    required: `${fieldLabel} is required`,
    invalid: `${fieldLabel} is invalid`,
    short: `${fieldLabel} is too short`,
    long: `${fieldLabel} is too long`,
    match: `${fieldName}s do not match`,
    exists: `${fieldLabel} already exists`,
    notFound: `${fieldLabel} not found`,
  };

  return errors[errorType] || `Invalid ${fieldName}`;
};

/**
 * Validate form object against rules
 * @param {object} formData - Form data object
 * @param {object} rules - Validation rules
 * @returns {object} Validation result with isValid and errors
 */
export const validateForm = (formData, rules) => {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach(fieldName => {
    const rule = rules[fieldName];
    const value = formData[fieldName];

    if (rule.required && (!value || value.toString().trim() === '')) {
      errors[fieldName] = getFieldErrorMessage(fieldName, 'required');
      isValid = false;
    } else if (rule.minLength && value && value.length < rule.minLength) {
      errors[fieldName] = getFieldErrorMessage(fieldName, 'short');
      isValid = false;
    } else if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[fieldName] = getFieldErrorMessage(fieldName, 'long');
      isValid = false;
    } else if (rule.pattern && value && !rule.pattern.test(value)) {
      errors[fieldName] = getFieldErrorMessage(fieldName, 'invalid');
      isValid = false;
    } else if (rule.custom && !rule.custom(value, formData)) {
      errors[fieldName] = rule.customMessage || getFieldErrorMessage(fieldName, 'invalid');
      isValid = false;
    }
  });

  return { isValid, errors };
};

/**
 * Sanitize form input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Check if form has changes
 * @param {object} originalData - Original form data
 * @param {object} currentData - Current form data
 * @returns {boolean} True if data has changed
 */
export const hasFormChanged = (originalData, currentData) => {
  return JSON.stringify(originalData) !== JSON.stringify(currentData);
};
