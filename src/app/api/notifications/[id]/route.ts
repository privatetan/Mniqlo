import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const UNIQLO_BASE_URL = 'https://www.uniqlo.cn';

type NotificationRecord = {
    id: string | number;
    user_id: number;
    title?: string | null;
    content?: string | null;
    timestamp?: string | null;
    product_id?: string | null;
    style?: string | null;
    size?: string | null;
};

function normalizeImageUrl(mainPic?: string | null) {
    if (!mainPic) return undefined;
    if (/^https?:\/\//i.test(mainPic)) return mainPic;
    return `${UNIQLO_BASE_URL}${mainPic.startsWith('/') ? '' : '/'}${mainPic}`;
}

function getFirstProductCode(content?: string | null) {
    const match = content?.match(/货号[：:]\s*([A-Za-z0-9]+)/);
    return match?.[1];
}

async function getNotificationImageUrl(notification: NotificationRecord) {
    const style = notification.style || '';
    const size = notification.size || '';

    if (notification.product_id) {
        const { data: favorite } = await supabase
            .from('favorites')
            .select('main_pic')
            .eq('user_id', notification.user_id)
            .eq('product_id', notification.product_id)
            .eq('color', style)
            .eq('size', size)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (favorite?.main_pic) {
            return normalizeImageUrl(favorite.main_pic);
        }

        const { data: crawledProduct } = await supabase
            .from('crawled_products')
            .select('main_pic')
            .eq('product_id', notification.product_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (crawledProduct?.main_pic) {
            return normalizeImageUrl(crawledProduct.main_pic);
        }

        const { data: limitedTimeProduct } = await supabase
            .from('limited_time_products')
            .select('main_pic')
            .eq('product_id', notification.product_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (limitedTimeProduct?.main_pic) {
            return normalizeImageUrl(limitedTimeProduct.main_pic);
        }
    }

    const productCode = getFirstProductCode(notification.content);
    if (!productCode) return undefined;

    const { data: crawledProduct } = await supabase
        .from('crawled_products')
        .select('main_pic')
        .eq('code', productCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (crawledProduct?.main_pic) {
        return normalizeImageUrl(crawledProduct.main_pic);
    }

    const { data: limitedTimeProduct } = await supabase
        .from('limited_time_products')
        .select('main_pic')
        .eq('code', productCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return normalizeImageUrl(limitedTimeProduct?.main_pic);
}

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

        const imageUrl = await getNotificationImageUrl(notification);

        const response = {
            id: notification.id,
            title: notification.title || '消息通知',
            content: notification.content || '',
            timestamp: notification.timestamp,
            productId: notification.product_id,
            style: notification.style,
            size: notification.size,
            username: user?.username,
            imageUrl,
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
