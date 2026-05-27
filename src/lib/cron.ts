
import {
    removeCatalogCrawlSchedule,
    syncCatalogCrawlSchedule,
    syncEnabledCatalogCrawlSchedules
} from './jobs/catalog-crawl-jobs';

export async function addOrUpdateJob(gender: string, cronExpression: string): Promise<boolean> {
    return syncCatalogCrawlSchedule('super', gender, cronExpression, true);
}

export async function removeJob(gender: string): Promise<boolean> {
    return removeCatalogCrawlSchedule('super', gender);
}

export async function startCron() {
    await syncEnabledCatalogCrawlSchedules();
}

export function stopCron() {
    return undefined;
}

export function isCronRunning(): boolean {
    return false;
}

export function getActiveJobs(): string[] {
    return [];
}
