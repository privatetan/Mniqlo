import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID required' }, { status: 400 });
    }

    try {
        const favorites = await prisma.favorite.findMany({
            where: { userId: parseInt(userId, 10) },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ success: true, favorites });
    } catch (error) {
        console.error('Favorites API Error:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to fetch favorites',
            error: String(error),
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, productId, code, name, price, style, size, imageUrl } = body;

        if (!userId || !productId) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const favorite = await prisma.favorite.create({
            data: {
                userId: parseInt(userId, 10),
                productId,
                code: code || productId, // Fallback
                name,
                price: parseFloat(price),
                style: style || '',
                size: size || '',
                imageUrl,
            },
        });

        return NextResponse.json({ success: true, favorite });
    } catch (error) {
        // Check for unique constraint violation
        console.error(error)
        return NextResponse.json({ success: false, message: 'Failed to add favorite' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');
    const style = searchParams.get('style');
    const size = searchParams.get('size');

    // Allow deleting by unique constraints or ID. For now let's use the composite key logic if ID is missing.
    // Or simpler: pass ID. But the frontend might not have the DB ID handy immediately unless fetched.
    // Let's implement deletion by composite keys as that's how we identify them mostly.

    if (!userId || !productId) {
        return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    try {
        // Handle empty strings robustly. If param not provided, it's null.
        // But DB stores empty strings for missing variations.
        // So we should query with style ?? ''
        const result = await prisma.favorite.deleteMany({
            where: {
                userId: parseInt(userId, 10),
                productId,
                style: style ?? '',
                size: size ?? ''
            }
        });
        return NextResponse.json({ success: true, count: result.count });
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Failed to delete' }, { status: 500 });
    }
}
