import {
    removeCatalogCrawlSchedule,
    syncCatalogCrawlSchedule,
    syncEnabledCatalogCrawlSchedules
} from './jobs/catalog-crawl-jobs';

export async function addOrUpdateLimitedTimeJob(gender: string, cronExpression: string): Promise<boolean> {
    return syncCatalogCrawlSchedule('limited-time', gender, cronExpression, true);
}

export async function removeLimitedTimeJob(gender: string): Promise<boolean> {
    return removeCatalogCrawlSchedule('limited-time', gender);
}

export async function startLimitedTimeCron() {
    await syncEnabledCatalogCrawlSchedules();
}
