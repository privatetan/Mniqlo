import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return NextResponse.json({ success: false, message: 'Task ID required' }, { status: 400 });
    }

    try {
        const logs = await prisma.taskLog.findMany({
            where: { taskId: parseInt(taskId, 10) },
            orderBy: { timestamp: 'desc' },
            take: 50 // Limit logs
        });
        return NextResponse.json({ success: true, logs });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to fetch logs' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { taskId, status, message } = body;

        if (!taskId || !status) {
            return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        }

        const log = await prisma.taskLog.create({
            data: {
                taskId: parseInt(taskId, 10),
                status,
                message,
            },
        });

        return NextResponse.json({ success: true, log });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to save log' }, { status: 500 });
    }
}
