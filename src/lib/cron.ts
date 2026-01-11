/**
 * Cron Job Manager for Scheduled Crawlers
 * 
 * This module sets up an interval-based execution system that checks
 * for due crawler schedules every minute and executes them.
 * 
 * For production deployment on Vercel, use Vercel Cron instead.
 */

let cronInterval: NodeJS.Timeout | null = null;

/**
 * Start the cron job
 * Checks for due schedules every minute
 */
export function startCron() {
    if (cronInterval) {
        console.log('[Cron] Already running');
        return;
    }

    console.log('[Cron] Starting crawler schedule checker...');

    // Run immediately on start
    executeCron();

    // Then run every minute
    cronInterval = setInterval(executeCron, 60 * 1000);

    console.log('[Cron] Crawler schedule checker started (runs every 60 seconds)');
}

/**
 * Stop the cron job
 */
export function stopCron() {
    if (cronInterval) {
        clearInterval(cronInterval);
        cronInterval = null;
        console.log('[Cron] Crawler schedule checker stopped');
    }
}

/**
 * Execute the cron job
 * Calls the /api/crawler-schedule/execute endpoint
 */
async function executeCron() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/crawler-schedule/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success && data.executed > 0) {
            console.log(`[Cron] Executed ${data.executed} scheduled crawls`);
            if (data.results) {
                data.results.forEach((result: any) => {
                    if (result.success) {
                        console.log(`[Cron]   ✓ ${result.gender}: ${result.newCount} new, ${result.soldOutCount} sold out`);
                    } else {
                        console.error(`[Cron]   ✗ ${result.gender}: ${result.error}`);
                    }
                });
            }
        }
    } catch (error) {
        console.error('[Cron] Failed to execute scheduled crawls:', error);
    }
}

/**
 * Check if cron is running
 */
export function isCronRunning(): boolean {
    return cronInterval !== null;
}

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
    // Delay start by 5 seconds to allow server to fully initialize
    setTimeout(() => {
        startCron();
    }, 5000);
}
