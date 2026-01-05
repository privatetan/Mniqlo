import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
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
