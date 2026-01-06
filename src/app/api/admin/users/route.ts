import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const username = req.headers.get('X-Admin-User');

        if (!username) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { username },
            select: { role: true }
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                wxUserId: true,
                notifyFrequency: true,
                _count: {
                    select: {
                        favorites: true,
                        tasks: true
                    }
                }
            },
            orderBy: {
                id: 'desc'
            }
        });

        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
