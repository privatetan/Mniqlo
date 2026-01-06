import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (!user) {
            return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
        }

        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

        // Check password (support both MD5 and legacy plain text)
        if (user.password === hashedPassword) {
            // Correct MD5 password
        } else if (user.password === password) {
            // Legacy plain text password - migrate to MD5
            await supabase
                .from('users')
                .update({ password: hashedPassword })
                .eq('id', user.id);
        } else {
            return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
        }

        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
