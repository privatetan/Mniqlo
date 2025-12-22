import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiLogging } from '@/lib/api-logger';

export const POST = withApiLogging(async (req: Request) => {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
        }

        // In a real app, hash and compare passwords!
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user || user.password !== password) {
            return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
        }

        // For simplicity, we just return success. Session handling can be done via cookies (JWT) or just client-side state for this starter.
        // Let's return the user info (excluding password).
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
});
