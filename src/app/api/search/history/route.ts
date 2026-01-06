import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, keyword } = body;

        if (!userId || !keyword) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const { data: searchRecord, error } = await supabase
            .from('search_histories')
            .insert([
                {
                    user_id: parseInt(userId, 10),
                    query: keyword,
                    timestamp: formatToLocalTime()
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: searchRecord });
    } catch (error) {
        console.error('Search History API Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to save search history' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    try {
        const { data: history, error } = await supabase
            .from('search_histories')
            .select('*')
            .eq('user_id', parseInt(userId, 10))
            .order('id', { ascending: false })
            .limit(100);

        if (error) throw error;

        // Fetch recent unique searches manually
        const uniqueHistory: any[] = [];
        const seen = new Set();

        for (const item of history || []) {
            if (!seen.has(item.query)) {
                seen.add(item.query);
                uniqueHistory.push({
                    ...item,
                    keyword: item.query, // Compatibility with frontend
                    createdAt: item.timestamp
                });
            }
            if (uniqueHistory.length >= 20) break;
        }

        return NextResponse.json({ success: true, history: uniqueHistory });
    } catch (error) {
        console.error('Search History GET Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch history' }, { status: 500 });
    }
}
