import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const username = req.headers.get('X-Admin-User');
        if (!username) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const admin = await prisma.user.findUnique({
            where: { username },
            select: { role: true }
        });

        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const userId = parseInt(params.userId, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ success: false, message: 'Invalid User ID' }, { status: 400 });
        }

        const tasks = await prisma.monitorTask.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, tasks });
    } catch (error) {
        console.error('Fetch user tasks error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
