/**
 * Cron Utility Functions
 * 
 * Provides helper functions for working with cron expressions:
 * - Converting minute intervals to cron expressions
 * - Validating cron expressions
 * - Getting human-readable descriptions
 * - Calculating next execution times
 */

const cronParser = require('cron-parser');
const CronParser = cronParser.default || cronParser.CronExpressionParser;

/**
 * Convert minute interval to cron expression
 * This maintains backward compatibility with the old interval_minutes system
 * 
 * @param minutes - Number of minutes between executions
 * @returns Standard cron expression
 * 
 * @example
 * intervalToCron(15)  // Returns: '* /15 * * * *' (every 15 minutes)
 * intervalToCron(60)  // Returns: '0 * * * *'   (every hour at minute 0)
 * intervalToCron(120) // Returns: '0 * /2 * * *' (every 2 hours)
 */
export function intervalToCron(minutes: number): string {
    if (minutes <= 0) {
        throw new Error('Interval must be greater than 0');
    }

    // For intervals that divide evenly into 60 minutes
    if (minutes < 60 && 60 % minutes === 0) {
        return `*/${minutes} * * * *`;
    }

    // For hourly intervals
    if (minutes === 60) {
        return '0 * * * *';
    }

    // For multi-hour intervals
    if (minutes % 60 === 0) {
        const hours = minutes / 60;
        if (hours < 24 && 24 % hours === 0) {
            return `0 */${hours} * * *`;
        }
    }

    // For daily intervals
    if (minutes >= 1440) {
        const days = Math.floor(minutes / 1440);
        return `0 0 */${days} * *`;
    }

    // Default: use the closest standard interval
    if (minutes < 30) return '*/15 * * * *';
    if (minutes < 60) return '*/30 * * * *';
    if (minutes < 120) return '0 * * * *';
    return '0 */2 * * *';
}

/**
 * Validate a cron expression
 * 
 * @param expression - Cron expression to validate
 * @returns true if valid, false otherwise
 */
export function validateCronExpression(expression: string): boolean {
    try {
        CronParser.parse(expression);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get human-readable description of a cron expression
 * 
 * @param expression - Cron expression
 * @returns Human-readable description in Chinese
 */
export function getCronDescription(expression: string): string {
    try {
        // Parse the cron expression
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) {
            return '无效的 Cron 表达式';
        }

        const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

        // Common patterns
        if (expression === '* * * * *') return '每分钟执行';
        if (expression === '0 * * * *') return '每小时执行';
        if (expression === '0 0 * * *') return '每天午夜执行';
        if (expression === '0 9 * * *') return '每天上午9点执行';
        if (expression === '0 0 * * 0') return '每周日午夜执行';
        if (expression === '0 0 1 * *') return '每月1号午夜执行';

        // Every N minutes
        if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
            const interval = minute.substring(2);
            return `每 ${interval} 分钟执行`;
        }

        // Every N hours
        if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
            const interval = hour.substring(2);
            return `每 ${interval} 小时执行`;
        }

        // Specific time daily
        if (!minute.includes('*') && !hour.includes('*') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
            return `每天 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} 执行`;
        }

        // Weekday specific
        if (dayOfWeek !== '*' && dayOfMonth === '*') {
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            if (dayOfWeek.includes('-')) {
                const [start, end] = dayOfWeek.split('-').map(Number);
                return `每 ${weekdays[start]}-${weekdays[end]} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} 执行`;
            }
            if (!isNaN(Number(dayOfWeek))) {
                return `每 ${weekdays[Number(dayOfWeek)]} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} 执行`;
            }
        }

        return '自定义 Cron 表达式';
    } catch (e) {
        return '无效的 Cron 表达式';
    }
}

/**
 * Get next N execution times for a cron expression
 * 
 * @param expression - Cron expression
 * @param count - Number of next execution times to return (default: 3)
 * @returns Array of Date objects representing next execution times
 */
export function getNextExecutionTimes(expression: string, count: number = 3): Date[] {
    try {
        const interval = CronParser.parse(expression);
        const times: Date[] = [];

        for (let i = 0; i < count; i++) {
            times.push(interval.next().toDate());
        }

        return times;
    } catch (e) {
        return [];
    }
}

/**
 * Format date to Chinese locale string
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatNextRunTime(date: Date): string {
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}
