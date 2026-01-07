import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        // 从 notification_logs 表获取通知详情
        const { data: notification, error } = await supabase
            .from('notification_logs')
            .select(`
        id,
        title,
        content,
        timestamp,
        product_id,
        style,
        size,
        users (
          username
        )
      `)
            .eq('id', id)
            .single();

        if (error || !notification) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        // 格式化返回数据
        const response = {
            id: notification.id,
            title: notification.title || '消息通知',
            content: notification.content || '',
            timestamp: notification.timestamp,
            productId: notification.product_id,
            style: notification.style,
            size: notification.size,
            username: (notification.users as any)?.username,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching notification:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
