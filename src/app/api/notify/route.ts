import { NextResponse } from 'next/server';
import { sendWxNotification } from '@/lib/wxpush';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content, username, productId, style, size } = body;

        if (!username) {
            return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
        }

        // Fetch user
        const { data: targetUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (userError || !targetUser) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        const recipientId = targetUser.wx_user_id;

        if (!recipientId) {
            return NextResponse.json({ success: false, message: 'Recipient (wxUserId) not set' }, { status: 404 });
        }

        // Rate limiting check using monitor_tasks
        let monitorTask = null;
        if (productId) {
            const frequencyInMinutes = targetUser.notify_frequency || 60;

            const { data: task } = await supabase
                .from('monitor_tasks')
                .select('*')
                .eq('user_id', targetUser.id)
                .eq('product_id', productId)
                .eq('style', style || null)
                .eq('size', size || null)
                .maybeSingle();

            monitorTask = task;

            if (monitorTask && monitorTask.last_push_time) {
                // Parse "yyyy-MM-dd HH:mm:ss"
                const lastPushStr = monitorTask.last_push_time.replace(' ', 'T');
                const lastPush = new Date(lastPushStr).getTime();
                const now = Date.now();
                const diffInMinutes = (now - lastPush) / (1000 * 60);

                if (diffInMinutes < frequencyInMinutes) {
                    const remaining = Math.ceil(frequencyInMinutes - diffInMinutes);
                    return NextResponse.json({
                        success: true,
                        skipped: true,
                        remainingMinutes: remaining,
                        frequency: frequencyInMinutes,
                        message: `Notification skipped due to rate limit (${remaining} mins remaining)`
                    });
                }
            }
        }

        if (!title || !content) {
            return NextResponse.json({ success: false, message: 'Title and content are required' }, { status: 400 });
        }

        // 先保存通知记录到数据库
        const nowStr = formatToLocalTime();
        const { data: savedNotification, error: insertError } = await supabase
            .from('notification_logs')
            .insert([
                {
                    user_id: targetUser.id,
                    title,
                    content,
                    product_id: productId || null,
                    style: style || null,
                    size: size || null,
                    timestamp: nowStr
                }
            ])
            .select()
            .single();

        if (insertError || !savedNotification) {
            console.error('Failed to save notification:', insertError);
            return NextResponse.json({ success: false, message: 'Failed to save notification' }, { status: 500 });
        }

        // 构建通知详情页链接
        const baseUrl = process.env.WECHAT_BASE_URL || 'http://localhost:3000';
        const notificationUrl = `${baseUrl}/notification?id=${savedNotification.id}`;

        // 发送微信通知,包含详情页链接
        const result = await sendWxNotification(recipientId, title, content, notificationUrl);

        if (result.success) {
            // Update MonitorTask lastPushTime
            if (monitorTask) {
                await supabase
                    .from('monitor_tasks')
                    .update({ last_push_time: nowStr })
                    .eq('id', monitorTask.id);
            }
        }

        return NextResponse.json({ ...result, frequency: targetUser.notify_frequency || 60 });
    } catch (error) {
        console.error('Notify Error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
