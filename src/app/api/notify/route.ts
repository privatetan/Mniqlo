import { NextResponse } from 'next/server';
import { sendWxNotification } from '@/lib/wxpush';
import { prisma } from '@/lib/prisma'; // Assumed available

export async function POST(req: Request) {
    try {
        const body = await req.json();
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
            return NextResponse.json({ success: false, message: 'Recipient (wxUserId) not found' }, { status: 404 });
        }

        // Rate limiting check
        if (productId) {
            const frequencyInMinutes = targetUser.notifyFrequency || 60;
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
                return NextResponse.json({
                    success: true,
                    skipped: true,
                    message: `Notification skipped due to rate limit (${frequencyInMinutes} mins)`
                });
            }
        }

        if (!title || !content) {
            return NextResponse.json({ success: false, message: 'Title and content are required' }, { status: 400 });
        }

        const result = await sendWxNotification(recipientId, title, content);

        if (result.success && productId) {
            // Log successful notification for rate limiting
            await prisma.notificationLog.create({
                data: {
                    userId: targetUser.id,
                    productId: productId,
                    style: style || null,
                    size: size || null,
                }
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Internal server error', error }, { status: 500 });
    }
}
