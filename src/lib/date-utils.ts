export function formatToLocalTime(date: Date = new Date()): string {
    // Force UTC+8 (Asia/Shanghai)
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(date);

    const getPart = (type: string) => parts.find(p => p.type === type)?.value;

    return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}

/**
 * Safely parses the "yyyy-MM-dd HH:mm:ss" string format used in our database.
 * Also handles legacy numeric timestamps and ISO strings.
 * Replaces the space with 'T' to ensure compatibility with all browsers (especially Safari/iOS).
 */
export function parseLocalTime(dateStr: string | number): Date {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'number') return new Date(dateStr);

    // If it already looks like ISO (contains T), just parse it
    if (dateStr.includes('T')) return new Date(dateStr);

    // Convert "yyyy-MM-dd HH:mm:ss" to "yyyy-MM-ddTHH:mm:ss"
    const isoStr = dateStr.replace(' ', 'T');
    const date = new Date(isoStr);

    // If parsing fails, fall back to original (maybe it's already a valid format)
    if (isNaN(date.getTime())) {
        return new Date(dateStr);
    }
    return date;
}

/**
 * Generates an ISO string with the local timezone offset (e.g., 2026-01-11T20:55:00.123+08:00)
 * This ensures the timestamp preserves the correct local time when stored or displayed.
 */
export function toLocalISOString(date: Date): string {
    const tzOffset = -date.getTimezoneOffset(); // in minutes
    const diff = tzOffset >= 0 ? '+' : '-';
    const pad = (n: number) => (n < 10 ? '0' : '') + n;

    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        '.' + (date.getMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        diff + pad(Math.floor(Math.abs(tzOffset) / 60)) + ':' + pad(Math.abs(tzOffset) % 60);
}
