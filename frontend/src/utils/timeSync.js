/**
 * Server time synchronization utility
 * Keeps client time in sync with server time
 */

let timeOffset = 0; // Difference between server and client time in milliseconds

/**
 * Initialize time synchronization
 * Fetches server time once and calculates the offset
 */
export const initTimeSync = async () => {
  try {
    const response = await fetch('/api/time');
    const data = await response.json();

    // Calculate offset: server_time - client_time
    const serverTime = new Date(data.timestamp).getTime();
    const clientTime = Date.now();
    timeOffset = serverTime - clientTime;

    console.log(`Time sync initialized. Offset: ${timeOffset}ms`);
  } catch (error) {
    console.error('Failed to sync with server time:', error);
    timeOffset = 0; // Fall back to client time if sync fails
  }
};

/**
 * Get current server time
 * @returns {Date} Current server time
 */
export const getServerTime = () => {
  return new Date(Date.now() + timeOffset);
};

/**
 * Get server time as ISO string
 * @returns {string} Server time in ISO format
 */
export const getServerTimeISO = () => {
  return getServerTime().toISOString();
};

/**
 * Get time offset in milliseconds
 * @returns {number} Offset between server and client time
 */
export const getTimeOffset = () => {
  return timeOffset;
};
