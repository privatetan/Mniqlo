import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
        }

        // In a real app, hash the password!
        const newUser = await prisma.user.create({
            data: {
                username,
                password,
            },
        });

        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
