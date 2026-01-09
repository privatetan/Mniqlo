import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gender = searchParams.get('gender');
        const code = searchParams.get('code');

        let query = supabase
            .from('crawled_products')
            .select('*')
            .order('created_at', { ascending: false });

        if (gender && gender !== '全部' && gender !== 'null') {
            query = query.eq('gender', gender);
        }

        if (code) {
            query = query.ilike('code', `%${code}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Debug: Log unique genders found in the database (useful for fixing mapping issues)
        if (data && data.length > 0) {
            const uniqueGenders = Array.from(new Set(data.map(item => item.gender)));
            console.log('[SuperSelection API] Unique genders in DB:', uniqueGenders);
        }

        return NextResponse.json({ success: true, items: data });
    } catch (error) {
        console.error('Super selection fetch error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
