import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return NextResponse.json({ success: false, message: 'Task ID required' }, { status: 400 });
    }

    try {
        const { data: logs, error } = await supabase
            .from('task_logs')
            .select('*')
            .eq('task_id', parseInt(taskId, 10))
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to fetch logs' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { taskId, status, message } = body;

        if (!taskId || !status) {
            return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        }

        const nowStr = formatToLocalTime();

        const { data: log, error } = await supabase
            .from('task_logs')
            .insert([
                {
                    task_id: parseInt(taskId, 10),
                    status,
                    message,
                    timestamp: nowStr,
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, log });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to save log' }, { status: 500 });
    }
}
