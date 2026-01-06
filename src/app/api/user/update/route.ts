import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { username, wxUserId, notifyFrequency } = await req.json();

        if (!username) {
            return NextResponse.json({ success: false, message: 'Username is required' }, { status: 400 });
        }

        const updateData: any = {
            wx_user_id: wxUserId
        };

        if (notifyFrequency !== undefined) {
            updateData.notify_frequency = parseInt(notifyFrequency, 10);
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('username', username)
            .select()
            .single();

        if (error) throw error;

        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
    }
}
