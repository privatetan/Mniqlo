import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { crawlUniqloProducts } from '@/lib/crawler';

/**
 * POST /api/crawler-schedule/execute
 * Execute all due scheduled crawls
 * This endpoint should be called by a cron job every minute
 */
export async function POST(request: Request) {
    try {
        const now = new Date();

        // Fetch all enabled schedules that are due for execution
        const { data: dueSchedules, error: fetchError } = await supabase
            .from('crawler_schedules')
            .select('*')
            .eq('is_enabled', true)
            .or(`next_run_time.is.null,next_run_time.lte.${now.toISOString()}`);

        if (fetchError) throw fetchError;

        if (!dueSchedules || dueSchedules.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No schedules due for execution',
                executed: 0
            });
        }

        const results = [];

        // Execute each due schedule
        for (const schedule of dueSchedules) {
            try {
                console.log(`[Cron] Executing scheduled crawl for ${schedule.gender}`);

                // Run the crawler
                const { totalFound, newItems, soldOutItems } = await crawlUniqloProducts(schedule.gender);

                // Calculate next run time
                const nextRunTime = new Date(now.getTime() + schedule.interval_minutes * 60000);

                // Update the schedule
                const { error: updateError } = await supabase
                    .from('crawler_schedules')
                    .update({
                        last_run_time: now.toISOString(),
                        next_run_time: nextRunTime.toISOString(),
                        updated_at: now.toISOString()
                    })
                    .eq('id', schedule.id);

                if (updateError) {
                    console.error(`[Cron] Failed to update schedule for ${schedule.gender}:`, updateError);
                }

                results.push({
                    gender: schedule.gender,
                    success: true,
                    totalFound,
                    newCount: newItems.length,
                    soldOutCount: soldOutItems.length,
                    nextRunTime: nextRunTime.toISOString()
                });

                console.log(`[Cron] Completed crawl for ${schedule.gender}: ${totalFound} items found, ${newItems.length} new, ${soldOutItems.length} sold out`);
            } catch (crawlError: any) {
                console.error(`[Cron] Failed to execute crawl for ${schedule.gender}:`, crawlError);
                results.push({
                    gender: schedule.gender,
                    success: false,
                    error: crawlError.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Executed ${results.length} scheduled crawls`,
            executed: results.length,
            results
        });
    } catch (error: any) {
        console.error('[Cron] Execute scheduled crawls error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to execute scheduled crawls'
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
