import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toLocalISOString } from '@/lib/date-utils';
import { intervalToCron } from '@/lib/cron-utils';
import { addOrUpdateLimitedTimeJob, removeLimitedTimeJob } from '@/lib/limited-time-cron';
import * as logger from '@/lib/logger';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('limited_time_crawler_schedules')
            .select('*')
            .order('gender', { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            schedules: data || []
        });
    } catch (error: any) {
        logger.error('GET /api/limited-time/crawler-schedule error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to fetch schedules'
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { gender, is_enabled, interval_minutes } = body;
        const parsedIntervalMinutes = Number(interval_minutes);

        if (!gender) {
            return NextResponse.json({
                success: false,
                error: 'Gender is required'
            }, { status: 400 });
        }

        if (!Number.isInteger(parsedIntervalMinutes) || parsedIntervalMinutes < 1) {
            return NextResponse.json({
                success: false,
                error: 'Interval must be at least 1 minute'
            }, { status: 400 });
        }

        let cron_expression: string;
        try {
            cron_expression = intervalToCron(parsedIntervalMinutes);
        } catch (error: any) {
            return NextResponse.json({
                success: false,
                error: error.message || 'Invalid interval'
            }, { status: 400 });
        }

        const updatePayload = {
            gender,
            is_enabled: is_enabled ?? true,
            interval_minutes: parsedIntervalMinutes,
            cron_expression,
            updated_at: toLocalISOString(new Date())
        };

        const { data, error } = await supabase
            .from('limited_time_crawler_schedules')
            .upsert(updatePayload, { onConflict: 'gender' })
            .select()
            .single();

        if (error) {
            throw error;
        }

        if (updatePayload.is_enabled) {
            addOrUpdateLimitedTimeJob(gender, cron_expression);
        } else {
            removeLimitedTimeJob(gender);
        }

        return NextResponse.json({
            success: true,
            schedule: data,
            message: `Schedule for ${gender} has been ${updatePayload.is_enabled ? 'enabled' : 'disabled'}`,
            cron_expression
        });
    } catch (error: any) {
        logger.error('POST /api/limited-time/crawler-schedule error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to save schedule'
        }, { status: 500 });
    }
}

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
            .from('limited_time_crawler_schedules')
            .delete()
            .eq('gender', gender);

        if (error) {
            throw error;
        }

        removeLimitedTimeJob(gender);

        return NextResponse.json({
            success: true,
            message: `Schedule for ${gender} has been deleted`
        });
    } catch (error: any) {
        logger.error('DELETE /api/limited-time/crawler-schedule error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete schedule'
        }, { status: 500 });
    }
}
