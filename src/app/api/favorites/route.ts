import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatToLocalTime } from '@/lib/date-utils';
import { getCurrentUser, unauthorized } from '@/lib/auth';

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
    const user = getCurrentUser();

    if (!user) {
        return unauthorized();
    }

    try {
        const { data: favorites, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user.id)
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
        const user = getCurrentUser();
        const parsedPrice = parsePrice(price);

        if (!user) {
            return unauthorized();
        }

        if (!productId) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const { data: favorite, error } = await supabase
            .from('favorites')
            .insert([
                {
                    user_id: user.id,
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
    const productId = searchParams.get('productId');
    const style = searchParams.get('style');
    const size = searchParams.get('size');
    const user = getCurrentUser();

    if (!user) {
        return unauthorized();
    }

    if (id) {
        try {
            const { error, count } = await supabase
                .from('favorites')
                .delete({ count: 'exact' })
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
            return NextResponse.json({ success: true, count });
        } catch (error) {
            console.error(error);
            return NextResponse.json({ success: false, message: 'Failed to delete by ID' }, { status: 500 });
        }
    }

    if (!productId) {
        return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    try {
        const { error, count } = await supabase
            .from('favorites')
            .delete({ count: 'exact' })
            .eq('user_id', user.id)
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
