import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { forbidden } from '@/lib/auth';
import { getAdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return forbidden();
        }

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, wx_user_id, notify_frequency')
            .order('id', { ascending: false });

        if (usersError) throw usersError;

        // Fetch counts for favorites and tasks
        // Since no foreign keys, we manually fetch and merge
        const { data: favoriteCounts } = await supabase
            .from('favorites')
            .select('user_id');

        const { data: taskCounts } = await supabase
            .from('monitor_tasks')
            .select('user_id');

        const usersWithCounts = users.map(user => {
            const favoritesCount = favoriteCounts?.filter(f => f.user_id === user.id).length || 0;
            const tasksCount = taskCounts?.filter(t => t.user_id === user.id).length || 0;

            return {
                id: user.id,
                username: user.username,
                wxUserId: user.wx_user_id,
                notifyFrequency: user.notify_frequency,
                _count: {
                    favorites: favoritesCount,
                    tasks: tasksCount
                }
            };
        });

        return NextResponse.json({ success: true, users: usersWithCounts });
    } catch (error) {
        console.error('Fetch users error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
