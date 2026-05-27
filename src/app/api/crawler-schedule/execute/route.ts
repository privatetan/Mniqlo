import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { enqueueCatalogCrawl } from '@/lib/jobs/catalog-crawl-jobs';
import * as logger from '@/lib/logger';

/**
 * POST /api/crawler-schedule/execute
 * Queue all enabled super-selection crawls.
 * Kept for compatibility with older external cron callers.
 */
export async function POST(request: Request) {
    try {
        const { data: schedules, error } = await supabase
            .from('crawler_schedules')
            .select('gender')
            .eq('is_enabled', true);

        if (error) throw error;

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No enabled schedules found',
                queued: 0
            });
        }

        const results = await Promise.all(schedules.map(async (schedule) => ({
            gender: schedule.gender,
            jobId: await enqueueCatalogCrawl('super', schedule.gender)
        })));

        return NextResponse.json({
            success: true,
            message: `Queued ${results.length} scheduled crawl(s)`,
            queued: results.filter((item) => item.jobId).length,
            results
        });
    } catch (error: any) {
        logger.error('[Jobs] Queue scheduled crawls error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to queue scheduled crawls'
        }, { status: 500 });
    }
}

/**
 * GET /api/crawler-schedule/execute
 * Manually trigger execution check (for testing)
 */
export async function GET() {
    return POST(new Request('http://localhost/api/crawler-schedule/execute', { method: 'POST' }));
}
