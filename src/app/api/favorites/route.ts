import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

function parseUserId(value: string | null) {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseRecordId(value: string | null) {
    if (!value) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePrice(value: unknown) {
    const parsed = Number.parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = parseUserId(searchParams.get('userId'));

    if (!userId) {
        return NextResponse.json({ success: false, message: 'Valid user ID required' }, { status: 400 });
    }

    try {
        const { data: favorites, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .order('id', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, favorites });
    } catch (error) {
        console.error('Favorites API Error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch favorites'
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { productId, code, name, price, style, size } = body;
        const userId = parseUserId(String(body.userId ?? ''));
        const parsedPrice = parsePrice(price);

        if (!userId || !productId) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const { data: favorite, error } = await supabase
            .from('favorites')
            .insert([
                {
                    user_id: userId,
                    product_id: productId,
                    code: code || productId,
                    name,
                    price: parsedPrice,
                    color: style || '',
                    size: size || '',
                    timestamp: formatToLocalTime(),
                    main_pic: body.mainPic || '' // Receive mainPic from body
                }
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, favorite });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to add favorite' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = parseRecordId(searchParams.get('id'));
    const userId = parseUserId(searchParams.get('userId'));
    const productId = searchParams.get('productId');
    const style = searchParams.get('style');
    const size = searchParams.get('size');

    if (id) {
        try {
            const { error, count } = await supabase
                .from('favorites')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (error) throw error;
            return NextResponse.json({ success: true, count });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ success: false, message: 'Failed to delete by ID' }, { status: 500 });
        }
    }

    if (!userId || !productId) {
        return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    try {
        const { error, count } = await supabase
            .from('favorites')
            .delete({ count: 'exact' })
            .eq('user_id', userId)
            .eq('product_id', productId)
            .eq('color', style ?? '')
            .eq('size', size ?? '');

        if (error) throw error;

        return NextResponse.json({ success: true, count });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: 'Failed to delete' }, { status: 500 });
    }
}
