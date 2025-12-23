import { NextResponse } from 'next/server';
import { sendWxNotification } from '@/lib/wxpush';
import { prisma } from '@/lib/prisma'; // Assumed available

export async function POST(req: Request) {
    try {
        console.log('Notify request received');
        const body = await req.json();
        console.log(`Request body: ${JSON.stringify(body)}`);
        const { title, content, username, productId, style, size } = body;

        // Default test ID if no user found or provided
        let recipientId = '';
        let targetUser = null;

        if (username) {
            targetUser = await prisma.user.findUnique({
                where: { username }
            });
            if (targetUser?.wxUserId) {
                recipientId = targetUser.wxUserId;
            }
        }

        if (!recipientId || !targetUser) {
            console.log(`User not found for username: ${username}`);
            return NextResponse.json({ success: false, message: 'Recipient (wxUserId) not found' }, { status: 404 });
        }




        // Rate limiting check
        let monitorTask = null;
        if (productId) {
            const frequencyInMinutes = targetUser.notifyFrequency || 60;

            // Try to find the monitoring task first
            monitorTask = await prisma.monitorTask.findFirst({
                where: {
                    userId: targetUser.id,
                    productId: productId,
                    ...(style && { style }),
                    ...(size && { size }),
                }
            });
            console.log(`[Notify] Finding task for user ${targetUser.id}, product ${productId}:`, monitorTask ? `Found (ID: ${monitorTask.id})` : 'Not Found');
            console.log('monitorTask Search Params:', { userId: targetUser.id, productId, style, size });

            if (monitorTask && monitorTask.lastPushTime) {
                const lastPush = new Date(monitorTask.lastPushTime).getTime();
                const now = Date.now();
                const diffInMinutes = (now - lastPush) / (1000 * 60);

                console.log(`[RateLimit] Last: ${lastPush}, Now: ${now}, Diff: ${diffInMinutes}, Freq: ${frequencyInMinutes}`);

                if (diffInMinutes < frequencyInMinutes) {
                    const remaining = Math.ceil(frequencyInMinutes - diffInMinutes);
                    console.log(`Rate limit hit (Task): ${remaining} remaining`);
                    return NextResponse.json({
                        success: true,
                        skipped: true,
                        remainingMinutes: remaining,
                        frequency: frequencyInMinutes,
                        message: `Notification skipped due to rate limit (${remaining} mins remaining)`
                    });
                }
            } else {
                // Fallback to NotificationLog if no task or no lastPushTime (e.g. first run or manual check without task)
                const lastLog = await prisma.notificationLog.findFirst({
                    where: {
                        userId: targetUser.id,
                        productId: productId,
                        ...(style && { style }),
                        ...(size && { size }),
                        timestamp: {
                            gte: new Date(Date.now() - frequencyInMinutes * 60 * 1000)
                        }
                    },
                    orderBy: { timestamp: 'desc' }
                });

                if (lastLog) {
                    const lastPush = new Date(lastLog.timestamp).getTime();
                    const now = Date.now();
                    const diffInMinutes = (now - lastPush) / (1000 * 60);

                    const remaining = Math.ceil(frequencyInMinutes - diffInMinutes);

                    return NextResponse.json({
                        success: true,
                        skipped: true,
                        remainingMinutes: remaining,
                        frequency: frequencyInMinutes,
                        message: `Notification skipped due to rate limit (${remaining} mins)`
                    });
                }
            }
        }

        if (!title || !content) {
            return NextResponse.json({ success: false, message: 'Title and content are required' }, { status: 400 });
        }

        const result = await sendWxNotification(recipientId, title, content);
        console.log('[Notify] Send result:', result);

        if (result.success && productId) {
            // Update MonitorTask lastPushTime
            if (monitorTask) {
                console.log('[Notify] Updating task', monitorTask.id, 'lastPushTime');
                try {
                    await prisma.monitorTask.update({
                        where: { id: monitorTask.id },
                        data: { lastPushTime: new Date() }
                    });
                    console.log('[Notify] Task updated');
                } catch (err) {
                    console.error('[Notify] Failed to update task:', err);
                }
            } else {
                console.log('[Notify] No monitor task found to update');
            }

            // Log successful notification for history
            console.log('[Notify] Creating notification log');
            await prisma.notificationLog.create({
                data: {
                    userId: targetUser.id,
                    productId: productId,
                    style: style || null,
                    size: size || null,
                }
            });
        }

        return NextResponse.json({ ...result, frequency: targetUser.notifyFrequency || 60 });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Internal server error', error }, { status: 500 });
    }
}
