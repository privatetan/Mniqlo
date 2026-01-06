import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');
    const style = searchParams.get('style');
    const size = searchParams.get('size');

    if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    try {
        let query = supabase
            .from('monitor_tasks')
            .select('*')
            .eq('user_id', parseInt(userId, 10));

        if (productId) query = query.eq('product_id', productId);
        if (style) query = query.eq('style', style);
        if (size) query = query.eq('size', size);

        const { data: tasks, error } = await query.order('id', { ascending: false });

        if (error) throw error;

        // Fetch latest log for each task manually (no foreign keys)
        const taskIds = tasks.map(t => t.id);
        const { data: allLogs } = await supabase
            .from('task_logs')
            .select('*')
            .in('task_id', taskIds)
            .order('timestamp', { ascending: false });

        const tasksWithLogs = tasks.map(task => {
            const latestLog = allLogs?.find(l => l.task_id === task.id);
            return {
                ...task,
                productId: task.product_id, // Map for frontend compatibility
                productName: task.product_name,
                productCode: task.product_code,
                targetPrice: task.target_price,
                isActive: task.is_active,
                startTime: task.start_time,
                endTime: task.end_time,
                lastPushTime: task.last_push_time,
                createdAt: task.created_at,
                logs: latestLog ? [latestLog] : []
            };
        });

        return NextResponse.json({ success: true, tasks: tasksWithLogs });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, productId, productName, productCode, style, size, targetPrice, frequency, isActive, startTime, endTime } = body;

        if (!userId || !productId) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Find existing task
        const { data: existing } = await supabase
            .from('monitor_tasks')
            .select('*')
            .eq('user_id', parseInt(userId, 10))
            .eq('product_id', productId)
            .eq('style', style || null)
            .eq('size', size || null)
            .maybeSingle();

        let task;
        const now = formatToLocalTime();

        if (existing) {
            const { data: updatedTask, error: updateError } = await supabase
                .from('monitor_tasks')
                .update({
                    product_name: productName || existing.product_name,
                    product_code: productCode || existing.product_code,
                    target_price: targetPrice !== undefined ? parseFloat(targetPrice) : existing.target_price,
                    frequency: frequency || existing.frequency,
                    is_active: isActive !== undefined ? isActive : existing.is_active,
                    start_time: startTime !== undefined ? startTime : existing.start_time,
                    end_time: endTime !== undefined ? endTime : existing.end_time,
                    updated_at: now
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (updateError) throw updateError;
            task = updatedTask;
        } else {
            const { data: newTask, error: createError } = await supabase
                .from('monitor_tasks')
                .insert([
                    {
                        user_id: parseInt(userId, 10),
                        product_id: productId,
                        product_name: productName,
                        product_code: productCode,
                        style,
                        size,
                        target_price: targetPrice ? parseFloat(targetPrice) : null,
                        frequency: frequency || 60,
                        is_active: isActive !== undefined ? isActive : true,
                        start_time: startTime || null,
                        end_time: endTime || null,
                        created_at: now,
                        updated_at: now
                    }
                ])
                .select()
                .single();

            if (createError) throw createError;
            task = newTask;
        }

        return NextResponse.json({ success: true, task });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to save task' }, { status: 500 });
    }
}
