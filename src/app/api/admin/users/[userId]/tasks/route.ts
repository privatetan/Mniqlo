import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { forbidden } from '@/lib/auth';
import { getAdminUser } from '@/lib/auth';

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return forbidden();
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
