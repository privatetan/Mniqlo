import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const sessionUser = getCurrentUser();

    if (!sessionUser) {
        return unauthorized();
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('id', sessionUser.id)
        .single();

    if (error || !user) {
        return unauthorized();
    }

    return NextResponse.json({
        success: true,
        user: {
            id: Number(user.id),
            username: user.username,
            role: user.role,
        },
    });
}
