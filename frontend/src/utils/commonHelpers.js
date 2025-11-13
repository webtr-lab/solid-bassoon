/**
 * Common Helper Utilities
 * Reusable functions for common operations
 */

/**
 * Debounce function execution
 * @param {function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {function} Debounced function
 */
export const debounce = (fn, delay = 300) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function execution
 * @param {function} fn - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {function} Throttled function
 */
export const throttle = (fn, delay = 300) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
};

/**
 * Merge objects deeply
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
export const deepMerge = (target, source) => {
  const result = { ...target };

  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  });

  return result;
};

/**
 * Get nested property value safely
 * @param {object} obj - Object to query
 * @param {string} path - Dot-notation path (e.g., 'user.address.city')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or defaultValue
 */
export const getNestedValue = (obj, path, defaultValue = undefined) => {
  if (!obj || !path) return defaultValue;

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }

  return current;
};

/**
 * Set nested property value safely
 * @param {object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 * @returns {object} Modified object
 */
export const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  if (lastKey) {
    current[lastKey] = value;
  }

  return obj;
};

/**
 * Filter array of objects by property value
 * @param {array} arr - Array to filter
 * @param {string} property - Property name to filter by
 * @param {*} value - Value to match
 * @returns {array} Filtered array
 */
export const filterBy = (arr, property, value) => {
  if (!Array.isArray(arr)) return [];
  return arr.filter(item => item[property] === value);
};

/**
 * Group array of objects by property
 * @param {array} arr - Array to group
 * @param {string} property - Property name to group by
 * @returns {object} Grouped object
 */
export const groupBy = (arr, property) => {
  if (!Array.isArray(arr)) return {};

  return arr.reduce((result, item) => {
    const key = item[property];
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
};

/**
 * Sort array of objects by property
 * @param {array} arr - Array to sort
 * @param {string} property - Property name to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {array} Sorted array
 */
export const sortBy = (arr, property, order = 'asc') => {
  if (!Array.isArray(arr)) return [];

  return [...arr].sort((a, b) => {
    const aVal = a[property];
    const bVal = b[property];

    if (typeof aVal === 'string') {
      return order === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

/**
 * Find unique values in array
 * @param {array} arr - Array to filter
 * @param {string} property - Optional property for objects
 * @returns {array} Array with unique values
 */
export const unique = (arr, property = null) => {
  if (!Array.isArray(arr)) return [];

  if (property) {
    const seen = new Set();
    return arr.filter(item => {
      const value = item[property];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  return [...new Set(arr)];
};

/**
 * Find difference between two arrays
 * @param {array} arr1 - First array
 * @param {array} arr2 - Second array
 * @returns {array} Elements in arr1 but not in arr2
 */
export const arrayDifference = (arr1, arr2) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  return arr1.filter(item => !arr2.includes(item));
};

/**
 * Find intersection of two arrays
 * @param {array} arr1 - First array
 * @param {array} arr2 - Second array
 * @returns {array} Elements present in both arrays
 */
export const arrayIntersection = (arr1, arr2) => {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
  return arr1.filter(item => arr2.includes(item));
};

/**
 * Sleep/delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms = 1000) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function execution with exponential backoff
 * @param {function} fn - Function to retry
 * @param {number} maxAttempts - Maximum attempts
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} Result of successful execution
 */
export const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        await sleep(backoffDelay);
      }
    }
  }

  throw lastError;
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Create a URL query string from object
 * @param {object} params - Parameters object
 * @returns {string} Query string
 */
export const createQueryString = (params) => {
  return Object.keys(params)
    .filter(key => params[key] !== null && params[key] !== undefined)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
};

/**
 * Parse URL query string to object
 * @param {string} queryString - Query string
 * @returns {object} Parameters object
 */
export const parseQueryString = (queryString = '') => {
  const params = {};

  queryString
    .replace('?', '')
    .split('&')
    .forEach(param => {
      const [key, value] = param.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });

  return params;
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise} Promise that resolves when copied
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
};
