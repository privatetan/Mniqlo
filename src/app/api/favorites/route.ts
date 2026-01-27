import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    try {
        const { data: favorites, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', parseInt(userId, 10))
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
        const { userId, productId, code, name, price, style, size } = body;

        if (!userId || !productId) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const { data: favorite, error } = await supabase
            .from('favorites')
            .insert([
                {
                    user_id: parseInt(userId, 10),
                    product_id: productId,
                    code: code || productId,
                    name,
                    price: parseFloat(price),
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
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');
    const style = searchParams.get('style');
    const size = searchParams.get('size');

    if (id) {
        try {
            const { error, count } = await supabase
                .from('favorites')
                .delete({ count: 'exact' })
                .eq('id', parseInt(id, 10));

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
            .eq('user_id', parseInt(userId, 10))
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
