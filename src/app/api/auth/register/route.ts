import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (existingUser) {
            return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 409 });
        }

        // In a real app, hash the password!
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password,
                    role: 'USER',
                    created_at: formatToLocalTime()
                }
            ])
            .select()
            .single();

        if (createError) throw createError;

        const { password: _, ...userWithoutPassword } = newUser;

        return NextResponse.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
