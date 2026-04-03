/**
 * Type declarations for timeSync.js
 */

/**
 * Initialize time synchronization with server
 */
export function initTimeSync(): Promise<void>;

/**
 * Get current server time
 */
export function getServerTime(): Date;

/**
 * Get server time as ISO string
 */
export function getServerTimeISO(): string;

/**
 * Get time offset in milliseconds
 */
export function getTimeOffset(): number;
