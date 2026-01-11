import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toLocalISOString } from '@/lib/date-utils';
import { intervalToCron } from '@/lib/cron-utils';
import { addOrUpdateJob, removeJob } from '@/lib/cron';

/**
 * GET /api/crawler-schedule
 * Fetch all crawler schedules
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('crawler_schedules')
            .select('*')
            .order('gender', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            schedules: data || []
        });
    } catch (error: any) {
        console.error('GET /api/crawler-schedule error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch schedules'
        }, { status: 500 });
    }
}

/**
 * POST /api/crawler-schedule
 * Create or update a crawler schedule
 * Accepts interval_minutes from UI and converts to cron_expression
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { gender, is_enabled, interval_minutes } = body;

        if (!gender) {
            return NextResponse.json({
                success: false,
                error: 'Gender is required'
            }, { status: 400 });
        }

        if (interval_minutes && interval_minutes < 1) {
            return NextResponse.json({
                success: false,
                error: 'Interval must be at least 1 minute'
            }, { status: 400 });
        }

        // Convert interval_minutes to cron expression
        let cron_expression = '0 * * * *'; // Default: every hour
        if (interval_minutes) {
            cron_expression = intervalToCron(interval_minutes);
        }

        const updatePayload = {
            gender,
            is_enabled: is_enabled ?? true,
            cron_expression,
            updated_at: toLocalISOString(new Date())
        };

        console.log('[CrawlerSchedule] Update Payload:', JSON.stringify(updatePayload, null, 2));

        // Upsert the schedule in database
        const { data, error } = await supabase
            .from('crawler_schedules')
            .upsert(updatePayload, {
                onConflict: 'gender'
            })
            .select()
            .single();

        if (error) throw error;

        // Dynamically update the cron job
        if (is_enabled) {
            const success = addOrUpdateJob(gender, cron_expression);
            if (!success) {
                console.error(`[CrawlerSchedule] Failed to add/update cron job for ${gender}`);
            }
        } else {
            // Remove the job if disabled
            removeJob(gender);
        }

        return NextResponse.json({
            success: true,
            schedule: data,
            message: `Schedule for ${gender} has been ${is_enabled ? 'enabled' : 'disabled'}`,
            cron_expression
        });
    } catch (error: any) {
        console.error('POST /api/crawler-schedule error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to save schedule'
        }, { status: 500 });
    }
}

/**
 * DELETE /api/crawler-schedule
 * Delete a crawler schedule
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gender = searchParams.get('gender');

        if (!gender) {
            return NextResponse.json({
                success: false,
                error: 'Gender parameter is required'
            }, { status: 400 });
        }

        const { error } = await supabase
            .from('crawler_schedules')
            .delete()
            .eq('gender', gender);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Schedule for ${gender} has been deleted`
        });
    } catch (error: any) {
        console.error('DELETE /api/crawler-schedule error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete schedule'
        }, { status: 500 });
    }
}
