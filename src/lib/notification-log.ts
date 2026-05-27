import { formatToLocalTime } from './date-utils';
import { supabase } from './supabase';

type NotificationLogInput = {
    userId: number;
    title: string;
    content: string;
    productId?: string | null;
    style?: string | null;
    size?: string | null;
    timestamp?: string;
    errorContext?: string;
};

export function getNotificationUrl(notificationId?: string | number | null): string | undefined {
    const baseUrl = process.env.WECHAT_BASE_URL?.replace(/\/$/, '');
    if (!baseUrl) return undefined;

    const notificationUrl = `${baseUrl}/notification`;
    if (!notificationId) return notificationUrl;

    return `${notificationUrl}?id=${encodeURIComponent(String(notificationId))}`;
}

export async function createNotificationLogUrl(input: NotificationLogInput): Promise<string | undefined> {
    const { data, error } = await supabase
        .from('notification_logs')
        .insert([
            {
                user_id: input.userId,
                title: input.title,
                content: input.content,
                product_id: input.productId || null,
                style: input.style || null,
                size: input.size || null,
                timestamp: input.timestamp || formatToLocalTime()
            }
        ])
        .select('id')
        .single();

    if (error || !data?.id) {
        console.error(input.errorContext || '[Notification] Failed to save notification log:', error);
        return getNotificationUrl();
    }

    return getNotificationUrl(data.id);
}
