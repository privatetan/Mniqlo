/**
 * Logger Utility
 * Provides formatted logging with timestamps
 */

/**
 * Get formatted timestamp for logging
 * @returns Timestamp string in format [MM-dd HH:mm:ss]
 */
export function getTimestamp(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `[${month}-${day} ${hours}:${minutes}:${seconds}]`;
}

/**
 * Log with timestamp
 */
export function log(...args: any[]) {
    console.log(getTimestamp(), ...args);
}

/**
 * Error log with timestamp
 */
export function error(...args: any[]) {
    console.error(getTimestamp(), ...args);
}

/**
 * Warn log with timestamp
 */
export function warn(...args: any[]) {
    console.warn(getTimestamp(), ...args);
}
