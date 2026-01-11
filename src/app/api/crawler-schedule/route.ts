import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

        if (interval_minutes && interval_minutes < 15) {
            return NextResponse.json({
                success: false,
                error: 'Interval must be at least 15 minutes'
            }, { status: 400 });
        }

        // Calculate next_run_time if enabling the schedule
        let next_run_time = null;
        if (is_enabled && interval_minutes) {
            const now = new Date();
            next_run_time = new Date(now.getTime() + interval_minutes * 60000);
        }

        // Upsert the schedule
        const { data, error } = await supabase
            .from('crawler_schedules')
            .upsert({
                gender,
                is_enabled: is_enabled ?? true,
                interval_minutes: interval_minutes ?? 60,
                next_run_time,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'gender'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            schedule: data,
            message: `Schedule for ${gender} has been ${is_enabled ? 'enabled' : 'disabled'}`
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
