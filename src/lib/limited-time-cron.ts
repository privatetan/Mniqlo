import cron from 'node-cron';
import { supabase } from './supabase';
import { validateCronExpression } from './cron-utils';
import * as logger from './logger';

const globalForLimitedTimeCron = global as unknown as {
    limitedTimeCronJobs: Map<string, any>;
    limitedTimeCronStarted: boolean;
};

const jobs = globalForLimitedTimeCron.limitedTimeCronJobs || new Map<string, any>();
if (process.env.NODE_ENV !== 'production') {
    globalForLimitedTimeCron.limitedTimeCronJobs = jobs;
}

async function loadSchedulesFromDB() {
    try {
        const { data, error } = await supabase
            .from('limited_time_crawler_schedules')
            .select('*')
            .eq('is_enabled', true);

        if (error) {
            logger.error('[LimitedTimeCron] Failed to load schedules:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        logger.error('[LimitedTimeCron] Unexpected load error:', error);
        return [];
    }
}

async function executeCrawl(gender: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/limited-time/crawl?gender=${encodeURIComponent(gender)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            logger.log(`[LimitedTimeCron] ✓ ${gender}: ${data.newCount} new, ${data.soldOutCount} sold out`);
            await supabase
                .from('limited_time_crawler_schedules')
                .update({ last_run_time: new Date().toISOString() })
                .eq('gender', gender);
        } else {
            logger.error(`[LimitedTimeCron] ✗ ${gender}: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        logger.error(`[LimitedTimeCron] Failed to execute crawl for ${gender}:`, error);
    }
}

export function addOrUpdateLimitedTimeJob(gender: string, cronExpression: string): boolean {
    try {
        if (!validateCronExpression(cronExpression)) {
            logger.error(`[LimitedTimeCron] Invalid cron expression for ${gender}: ${cronExpression}`);
            return false;
        }

        if (jobs.has(gender)) {
            jobs.get(gender)?.stop();
            jobs.delete(gender);
        }

        const task = cron.schedule(cronExpression, async () => {
            const jitterMs = Math.floor(Math.random() * 10000);
            await new Promise(resolve => setTimeout(resolve, jitterMs));
            await executeCrawl(gender);
        }, {
            timezone: 'Asia/Shanghai'
        });

        jobs.set(gender, task);
        logger.log(`[LimitedTimeCron] ✓ Scheduled job for ${gender}: ${cronExpression}`);
        return true;
    } catch (error) {
        logger.error(`[LimitedTimeCron] Failed to add/update job for ${gender}:`, error);
        return false;
    }
}

export function removeLimitedTimeJob(gender: string): boolean {
    try {
        if (!jobs.has(gender)) {
            return false;
        }

        jobs.get(gender)?.stop();
        jobs.delete(gender);
        logger.log(`[LimitedTimeCron] Removed job for ${gender}`);
        return true;
    } catch (error) {
        logger.error(`[LimitedTimeCron] Failed to remove job for ${gender}:`, error);
        return false;
    }
}

export async function startLimitedTimeCron() {
    try {
        const schedules = await loadSchedulesFromDB();
        for (const schedule of schedules) {
            if (schedule.cron_expression) {
                addOrUpdateLimitedTimeJob(schedule.gender, schedule.cron_expression);
            }
        }
    } catch (error) {
        logger.error('[LimitedTimeCron] Failed to start scheduler:', error);
    }
}

setTimeout(() => {
    if (globalForLimitedTimeCron.limitedTimeCronStarted) {
        return;
    }

    globalForLimitedTimeCron.limitedTimeCronStarted = true;
    startLimitedTimeCron().catch(error => {
        logger.error('[LimitedTimeCron] Auto-start failed:', error);
        globalForLimitedTimeCron.limitedTimeCronStarted = false;
    });
}, process.env.NODE_ENV === 'development' ? 5000 : 3000);
