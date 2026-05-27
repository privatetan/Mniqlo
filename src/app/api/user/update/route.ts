import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAdminUser, getCurrentUser, unauthorized, forbidden } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const { username, userId, wxUserId, notifyFrequency } = await req.json();
        const currentUser = getCurrentUser();

        if (!currentUser) {
            return unauthorized();
        }

        let targetUserId = currentUser.id;
        if (userId || username) {
            const admin = await getAdminUser();
            if (!admin) {
                return forbidden();
            }

            if (userId) {
                targetUserId = parseInt(String(userId), 10);
            } else {
                const { data: targetUser, error: targetUserError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('username', username)
                    .single();

                if (targetUserError || !targetUser) {
                    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
                }

                targetUserId = Number(targetUser.id);
            }
        }

        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            return NextResponse.json({ success: false, message: 'Valid user ID required' }, { status: 400 });
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
            .eq('id', targetUserId)
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
