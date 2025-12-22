import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, keyword } = body;

        if (!userId || !keyword) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Optional: Check if the user exists
        // const user = await prisma.user.findUnique({ where: { id: userId } });
        // if (!user) ...

        const searchRecord = await prisma.searchHistory.create({
            data: {
                userId: parseInt(userId, 10),
                keyword,
            },
        });

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
        // Fetch recent unique searches
        // Prisma `distinct` is useful here
        const history = await prisma.searchHistory.findMany({
            where: {
                userId: parseInt(userId, 10),
            },
            orderBy: {
                createdAt: 'desc',
            },
            distinct: ['keyword'],
            take: 20, // get top 20 unique
        });

        return NextResponse.json({ success: true, history });
    } catch (error) {
        console.error('Search History GET Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch history' }, { status: 500 });
    }
}
