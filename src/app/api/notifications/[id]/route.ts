import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        const { data: notification, error } = await supabase
            .from('notification_logs')
            .select(`
        id,
        user_id,
        title,
        content,
        timestamp,
        product_id,
        style,
        size
      `)
            .eq('id', id)
            .single();

        if (error || !notification) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        const { data: user } = await supabase
            .from('users')
            .select('username')
            .eq('id', notification.user_id)
            .maybeSingle();

        const response = {
            id: notification.id,
            title: notification.title || '消息通知',
            content: notification.content || '',
            timestamp: notification.timestamp,
            productId: notification.product_id,
            style: notification.style,
            size: notification.size,
            username: user?.username,
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
