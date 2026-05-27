import { PgBoss } from 'pg-boss';
import type { Job, WorkHandler } from 'pg-boss';
import * as logger from '@/lib/logger';

type QueueRegistration = {
  name: string;
  options?: Parameters<PgBoss['createQueue']>[1];
};

type WorkerRegistration<TData extends object = object> = {
  queue: string;
  options?: Parameters<PgBoss['work']>[1];
  handler: WorkHandler<TData>;
};

type JobRuntimeState = {
  boss?: PgBoss;
  startPromise?: Promise<PgBoss | null>;
  workerIds: Set<string>;
};

const globalForJobs = global as unknown as {
  mniqloJobRuntime?: JobRuntimeState;
};

const state = globalForJobs.mniqloJobRuntime || {
  workerIds: new Set<string>()
};

if (process.env.NODE_ENV !== 'production') {
  globalForJobs.mniqloJobRuntime = state;
}

const queues: QueueRegistration[] = [];
const workers: WorkerRegistration[] = [];

function getConnectionString(): string | null {
  const value = process.env.PG_BOSS_DATABASE_URL || process.env.POSTGRES_URL || null;
  if (!value) {
    return null;
  }

  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    return null;
  }

  const url = new URL(value);
  if (
    process.env.PG_BOSS_SSL_REJECT_UNAUTHORIZED !== 'true'
    && url.searchParams.get('sslmode') === 'require'
    && !url.searchParams.has('uselibpqcompat')
  ) {
    url.searchParams.set('uselibpqcompat', 'true');
  }

  return url.toString();
}

function shouldStartWorkers() {
  return process.env.JOB_WORKER_ENABLED !== 'false';
}

function getSslOptions() {
  if (process.env.PG_BOSS_SSL === 'false') {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.PG_BOSS_SSL_REJECT_UNAUTHORIZED === 'true'
  };
}

export function isJobRuntimeConfigured() {
  return Boolean(getConnectionString());
}

export function registerQueue(queue: QueueRegistration) {
  if (!queues.some((item) => item.name === queue.name)) {
    queues.push(queue);
  }
}

export function registerWorker<TData extends object>(worker: WorkerRegistration<TData>) {
  if (!workers.some((item) => item.queue === worker.queue)) {
    workers.push(worker as WorkerRegistration);
  }
}

export async function getJobBoss(): Promise<PgBoss | null> {
  const connectionString = getConnectionString();
  if (!connectionString) {
    logger.warn('[Jobs] PG_BOSS_DATABASE_URL is not configured; job runtime is disabled.');
    return null;
  }

  if (state.boss) {
    return state.boss;
  }

  if (!state.startPromise) {
    state.startPromise = (async () => {
      const boss = new PgBoss({
        connectionString,
        ssl: getSslOptions(),
        schema: process.env.PG_BOSS_SCHEMA || 'pgboss',
        schedule: shouldStartWorkers(),
        supervise: shouldStartWorkers(),
        migrate: process.env.PG_BOSS_MIGRATE !== 'false',
        createSchema: process.env.PG_BOSS_CREATE_SCHEMA !== 'false'
      });

      boss.on('error', (error) => logger.error('[Jobs] pg-boss error:', error));
      boss.on('warning', (warning) => logger.warn('[Jobs] pg-boss warning:', warning));

      await boss.start();

      for (const queue of queues) {
        await boss.createQueue(queue.name, queue.options);
      }

      if (shouldStartWorkers()) {
        for (const worker of workers) {
          const workerId = await boss.work(worker.queue, worker.options as never, worker.handler as never);
          state.workerIds.add(workerId);
        }
      }

      state.boss = boss;
      logger.log(`[Jobs] pg-boss started with ${queues.length} queue(s) and ${state.workerIds.size} worker(s).`);
      return boss;
    })().catch((error) => {
      state.startPromise = undefined;
      logger.error('[Jobs] Failed to start pg-boss:', error);
      return null;
    });
  }

  return state.startPromise;
}

export async function startJobRuntime() {
  await getJobBoss();
}

export async function stopJobRuntime() {
  if (!state.boss) {
    return;
  }

  await state.boss.stop();
  state.boss = undefined;
  state.startPromise = undefined;
  state.workerIds.clear();
}

export type JobHandler<TData extends object> = (job: Job<TData>) => Promise<void>;
