import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { username, wxUserId, notifyFrequency } = await req.json();

        if (!username) {
            return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { username },
            data: {
                wxUserId,
                ...(notifyFrequency !== undefined && { notifyFrequency: parseInt(notifyFrequency, 10) })
            },
        });

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
    }
}
