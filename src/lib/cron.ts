/**
 * Cron Job Manager for Scheduled Crawlers
 * 
 * This module uses node-cron to manage scheduled crawler tasks.
 * It supports dynamic job management - jobs can be added, updated, or removed at runtime.
 * 
 * For production deployment on Vercel, use Vercel Cron instead.
 */

import cron from 'node-cron';
import { supabase } from './supabase';
import { validateCronExpression } from './cron-utils';

// Store active cron jobs by gender
const jobs = new Map<string, ReturnType<typeof cron.schedule>>();

/**
 * Load all enabled schedules from database
 */
async function loadSchedulesFromDB() {
    try {
        const { data, error } = await supabase
            .from('crawler_schedules')
            .select('*')
            .eq('is_enabled', true);

        if (error) {
            console.error('[Cron] Failed to load schedules from database:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[Cron] Error loading schedules:', error);
        return [];
    }
}

/**
 * Execute crawler for a specific gender
 */
async function executeCrawl(gender: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/crawl?gender=${encodeURIComponent(gender)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            console.log(`[Cron] ✓ ${gender}: ${data.newCount} new, ${data.soldOutCount} sold out`);

            // Update last_run_time
            await supabase
                .from('crawler_schedules')
                .update({ last_run_time: new Date().toISOString() })
                .eq('gender', gender);
        } else {
            console.error(`[Cron] ✗ ${gender}: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error(`[Cron] Failed to execute crawl for ${gender}:`, error);
    }
}

/**
 * Add or update a cron job for a specific gender
 * 
 * @param gender - Gender category (女装/男装/童装/婴幼儿装)
 * @param cronExpression - Cron expression (e.g., '* /30 * * * *')
 */
export function addOrUpdateJob(gender: string, cronExpression: string): boolean {
    try {
        // Validate cron expression
        if (!validateCronExpression(cronExpression)) {
            console.error(`[Cron] Invalid cron expression for ${gender}: ${cronExpression}`);
            return false;
        }

        // Remove existing job if any
        if (jobs.has(gender)) {
            jobs.get(gender)?.stop();
            jobs.delete(gender);
            console.log(`[Cron] Stopped existing job for ${gender}`);
        }

        // Create new job
        const task = cron.schedule(cronExpression, async () => {
            console.log(`[Cron] Executing scheduled crawl for ${gender}`);
            await executeCrawl(gender);
        }, {
            timezone: 'Asia/Shanghai'
        });

        jobs.set(gender, task);
        console.log(`[Cron] ✓ Scheduled job for ${gender}: ${cronExpression}`);

        return true;
    } catch (error) {
        console.error(`[Cron] Failed to add/update job for ${gender}:`, error);
        return false;
    }
}

/**
 * Remove a cron job for a specific gender
 * 
 * @param gender - Gender category
 */
export function removeJob(gender: string): boolean {
    try {
        if (jobs.has(gender)) {
            jobs.get(gender)?.stop();
            jobs.delete(gender);
            console.log(`[Cron] Removed job for ${gender}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`[Cron] Failed to remove job for ${gender}:`, error);
        return false;
    }
}

/**
 * Start the cron job manager
 * Loads all enabled schedules from database and starts them
 */
export async function startCron() {
    console.log('[Cron] Starting crawler schedule manager...');

    try {
        const schedules = await loadSchedulesFromDB();

        if (schedules.length === 0) {
            console.log('[Cron] No enabled schedules found');
            return;
        }

        console.log(`[Cron] Loading ${schedules.length} enabled schedule(s)...`);

        for (const schedule of schedules) {
            if (schedule.cron_expression) {
                addOrUpdateJob(schedule.gender, schedule.cron_expression);
            } else {
                console.warn(`[Cron] Schedule for ${schedule.gender} has no cron expression`);
            }
        }

        console.log(`[Cron] Crawler schedule manager started with ${jobs.size} active job(s)`);
    } catch (error) {
        console.error('[Cron] Failed to start cron manager:', error);
    }
}

/**
 * Stop all cron jobs
 */
export function stopCron() {
    console.log('[Cron] Stopping all crawler schedules...');

    jobs.forEach((task, gender) => {
        task.stop();
        console.log(`[Cron] Stopped job for ${gender}`);
    });

    jobs.clear();
    console.log('[Cron] All crawler schedules stopped');
}

/**
 * Check if cron manager is running
 */
export function isCronRunning(): boolean {
    return jobs.size > 0;
}

/**
 * Get list of active jobs
 */
export function getActiveJobs(): string[] {
    return Array.from(jobs.keys());
}

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
    // Delay start by 5 seconds to allow server to fully initialize
    setTimeout(() => {
        startCron();
    }, 5000);
}
