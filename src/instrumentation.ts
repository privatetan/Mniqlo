export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/cron');
    await import('./lib/limited-time-cron');
  }
}
