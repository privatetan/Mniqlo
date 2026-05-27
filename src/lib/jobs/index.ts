import './catalog-crawl-jobs';

import { startJobRuntime } from './runtime';
import { syncEnabledCatalogCrawlSchedules } from './catalog-crawl-jobs';

const globalForJobBootstrap = global as unknown as {
  mniqloJobsStarted?: boolean;
};

export async function startJobs() {
  if (globalForJobBootstrap.mniqloJobsStarted) {
    return;
  }

  globalForJobBootstrap.mniqloJobsStarted = true;
  await startJobRuntime();
  await syncEnabledCatalogCrawlSchedules();
}
