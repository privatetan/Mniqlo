import { supabase } from '@/lib/supabase';
import { crawlUniqloProducts } from '@/lib/crawler';
import { crawlLimitedTimeProducts } from '@/lib/limited-time';
import * as logger from '@/lib/logger';
import {
  getJobBoss,
  isJobRuntimeConfigured,
  registerQueue,
  registerWorker
} from './runtime';

export type CatalogFeature = 'super' | 'limited-time';

type CatalogCrawlJob = {
  feature: CatalogFeature;
  gender: string;
};

const QUEUE_NAME = 'catalog-crawl';
const TIMEZONE = 'Asia/Shanghai';

function toKeyPart(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

const scheduleKey = (feature: CatalogFeature, gender: string) => `${feature}/${toKeyPart(gender)}`;

registerQueue({
  name: QUEUE_NAME,
  options: {
    policy: 'key_strict_fifo',
    retryLimit: 2,
    retryDelay: 60,
    retryBackoff: true,
    expireInSeconds: 60 * 60,
    deleteAfterSeconds: 7 * 24 * 60 * 60
  }
});

registerWorker<CatalogCrawlJob>({
  queue: QUEUE_NAME,
  options: {
    pollingIntervalSeconds: 5
  },
  handler: async (jobs) => {
    for (const job of jobs) {
      await executeCatalogCrawl(job.data);
    }
  }
});

function getScheduleTable(feature: CatalogFeature) {
  return feature === 'super' ? 'crawler_schedules' : 'limited_time_crawler_schedules';
}

async function executeCatalogCrawl({ feature, gender }: CatalogCrawlJob) {
  const result = feature === 'super'
    ? await crawlUniqloProducts(gender)
    : await crawlLimitedTimeProducts(gender);

  await supabase
    .from(getScheduleTable(feature))
    .update({ last_run_time: new Date().toISOString() })
    .eq('gender', gender);

  logger.log(`[Jobs] ${feature}/${gender}: ${result.totalFound} total, ${result.newItems.length} new, ${result.soldOutItems.length} sold out`);
}

export async function syncCatalogCrawlSchedule(
  feature: CatalogFeature,
  gender: string,
  cronExpression: string,
  isEnabled: boolean
) {
  if (!isJobRuntimeConfigured()) {
    logger.warn(`[Jobs] Skipped schedule sync for ${feature}/${gender}: pg-boss is not configured.`);
    return false;
  }

  const boss = await getJobBoss();
  if (!boss) {
    return false;
  }

  const key = scheduleKey(feature, gender);

  if (!isEnabled) {
    await boss.unschedule(QUEUE_NAME, key);
    await deleteQueuedCatalogCrawlJobs(feature, gender);
    return true;
  }

  await boss.schedule(
    QUEUE_NAME,
    cronExpression,
    { feature, gender },
    {
      key,
      tz: TIMEZONE,
      singletonKey: key,
      group: { id: key }
    }
  );

  return true;
}

export async function removeCatalogCrawlSchedule(feature: CatalogFeature, gender: string) {
  if (!isJobRuntimeConfigured()) {
    logger.warn(`[Jobs] Skipped schedule removal for ${feature}/${gender}: pg-boss is not configured.`);
    return false;
  }

  const boss = await getJobBoss();
  if (!boss) {
    return false;
  }

  await boss.unschedule(QUEUE_NAME, scheduleKey(feature, gender));
  await deleteQueuedCatalogCrawlJobs(feature, gender);
  return true;
}

export async function enqueueCatalogCrawl(feature: CatalogFeature, gender: string) {
  const boss = await getJobBoss();
  if (!boss) {
    return null;
  }

  const key = scheduleKey(feature, gender);
  return boss.send(QUEUE_NAME, { feature, gender }, {
    singletonKey: key,
    group: { id: key }
  });
}

async function deleteQueuedCatalogCrawlJobs(feature: CatalogFeature, gender: string) {
  const boss = await getJobBoss();
  if (!boss) {
    return;
  }

  const key = scheduleKey(feature, gender);
  const jobs = await boss.findJobs<CatalogCrawlJob>(QUEUE_NAME, { key, queued: true });
  if (jobs.length === 0) {
    return;
  }

  await boss.deleteJob(QUEUE_NAME, jobs.map((job) => job.id));
}

export async function syncEnabledCatalogCrawlSchedules() {
  if (!isJobRuntimeConfigured()) {
    logger.warn('[Jobs] Skipped initial schedule sync: pg-boss is not configured.');
    return;
  }

  const configs: Array<{ feature: CatalogFeature; table: string }> = [
    { feature: 'super', table: 'crawler_schedules' },
    { feature: 'limited-time', table: 'limited_time_crawler_schedules' }
  ];

  for (const config of configs) {
    const { data, error } = await supabase
      .from(config.table)
      .select('gender, cron_expression, is_enabled')
      .eq('is_enabled', true);

    if (error) {
      logger.error(`[Jobs] Failed to load ${config.feature} schedules:`, error);
      continue;
    }

    for (const schedule of data || []) {
      if (schedule.cron_expression) {
        await syncCatalogCrawlSchedule(
          config.feature,
          schedule.gender,
          schedule.cron_expression,
          Boolean(schedule.is_enabled)
        );
      }
    }
  }
}
