import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { forbidden, getAdminUser } from '@/lib/auth';

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
            .from('limited_time_push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            throw error;
        }

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
        console.error('Fetch limited-time push settings error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

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

        const { data: existing } = await supabase
            .from('limited_time_push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        let result;
        if (existing) {
            result = await supabase
                .from('limited_time_push_subscriptions')
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
                .from('limited_time_push_subscriptions')
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

        if (result.error) {
            throw result.error;
        }

        return NextResponse.json({ success: true, settings: result.data });
    } catch (error) {
        console.error('Update limited-time push settings error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
