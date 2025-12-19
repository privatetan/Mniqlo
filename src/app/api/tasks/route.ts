import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        const tasks = await prisma.monitorTask.findMany({
            where: {
                userId: parseInt(userId, 10),
                ...(productId && { productId }),
                ...(style && { style }),
                ...(size && { size })
            },
            orderBy: { createdAt: 'desc' },
            include: {
                logs: {
                    take: 1,
                    orderBy: { timestamp: 'desc' }
                }
            }
        });
        return NextResponse.json({ success: true, tasks });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, productId, style, size, targetPrice, frequency, isActive, startTime, endTime } = body;

        if (!userId || !productId) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Find existing task by productId AND style/size
        const existing = await prisma.monitorTask.findFirst({
            where: {
                userId: parseInt(userId, 10),
                productId,
                style: style || null,
                size: size || null
            }
        });

        let task;
        if (existing) {
            task = await prisma.monitorTask.update({
                where: { id: existing.id },
                data: {
                    targetPrice: targetPrice !== undefined ? parseFloat(targetPrice) : existing.targetPrice,
                    frequency: frequency || existing.frequency,
                    isActive: isActive !== undefined ? isActive : existing.isActive,
                    startTime: startTime !== undefined ? startTime : existing.startTime,
                    endTime: endTime !== undefined ? endTime : existing.endTime
                }
            });
        } else {
            task = await prisma.monitorTask.create({
                data: {
                    userId: parseInt(userId, 10),
                    productId,
                    style,
                    size,
                    targetPrice: targetPrice ? parseFloat(targetPrice) : null,
                    frequency: frequency || 60,
                    isActive: isActive !== undefined ? isActive : true,
                    startTime: startTime || null,
                    endTime: endTime || null
                }
            });
        }

        return NextResponse.json({ success: true, task });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to save task' }, { status: 500 });
    }
}
