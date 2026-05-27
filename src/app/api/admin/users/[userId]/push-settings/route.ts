import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { forbidden, getAdminUser } from '@/lib/auth';

/**
 * GET: Fetch super selection push settings for a user
 */
export async function GET(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return forbidden();
        }

        const userId = parseInt(params.userId, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ success: false, message: 'Invalid User ID' }, { status: 400 });
        }

        const { data: settings, error } = await supabase
            .from('super_push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            settings: settings || {
                user_id: userId,
                is_enabled: false,
                channel: 'WECHAT',
                frequency: 60,
                genders: []
            }
        });
    } catch (error) {
        console.error('Fetch push settings error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST: Update or create super selection push settings
 */
export async function POST(
    req: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const admin = await getAdminUser();
        if (!admin) {
            return forbidden();
        }

        const userId = parseInt(params.userId, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ success: false, message: 'Invalid User ID' }, { status: 400 });
        }

        const body = await req.json();
        const { is_enabled, channel, frequency, genders } = body;

        // Upsert settings
        const { data: existing } = await supabase
            .from('super_push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        let result;
        if (existing) {
            result = await supabase
                .from('super_push_subscriptions')
                .update({
                    is_enabled,
                    channel,
                    frequency,
                    genders,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('super_push_subscriptions')
                .insert({
                    user_id: userId,
                    is_enabled,
                    channel,
                    frequency,
                    genders,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ success: true, settings: result.data });
    } catch (error) {
        console.error('Update push settings error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
