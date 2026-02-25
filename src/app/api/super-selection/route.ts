import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 1000;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const gender = searchParams.get('gender');
        const code = searchParams.get('code');
        const allItems: any[] = [];
        let from = 0;

        while (true) {
            let query = supabase
                .from('crawled_products')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + PAGE_SIZE - 1);

            if (gender && gender !== '全部' && gender !== 'null') {
                query = query.eq('gender', gender);
            }

            if (code) {
                query = query.ilike('code', `%${code}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            const pageItems = data || [];
            allItems.push(...pageItems);

            if (pageItems.length < PAGE_SIZE) {
                break;
            }

            from += PAGE_SIZE;
        }

        // Debug: Log unique genders found in the database (useful for fixing mapping issues)
        if (allItems.length > 0) {
            const uniqueGenders = Array.from(new Set(allItems.map(item => item.gender)));
            console.log('[SuperSelection API] Unique genders in DB:', uniqueGenders, 'total:', allItems.length);
        }

        return NextResponse.json({ success: true, items: allItems });
    } catch (error) {
        console.error('Super selection fetch error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
