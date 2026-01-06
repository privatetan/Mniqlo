import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const username = req.headers.get('X-Admin-User');
        if (!username) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { data: admin, error: adminError } = await supabase
            .from('users')
            .select('role')
            .eq('username', username)
            .single();

        if (adminError || !admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const userId = parseInt(params.userId, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ success: false, message: 'Invalid User ID' }, { status: 400 });
        }

        const { data: tasks, error } = await supabase
            .from('monitor_tasks')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: false });

        if (error) throw error;

        // Map fields for frontend compatibility
        const mappedTasks = tasks.map(task => ({
            ...task,
            productId: task.product_id,
            productName: task.product_name,
            productCode: task.product_code,
            targetPrice: task.target_price,
            isActive: task.is_active,
            startTime: task.start_time,
            endTime: task.end_time,
            lastPushTime: task.last_push_time,
            createdAt: task.created_at
        }));

        return NextResponse.json({ success: true, tasks: mappedTasks });
    } catch (error) {
        console.error('Fetch user tasks error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
