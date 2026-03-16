import { NextResponse } from 'next/server';
import { crawlLimitedTimeProducts } from '@/lib/limited-time';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gender = searchParams.get('gender') || undefined;
        const { totalFound, newItems, soldOutItems } = await crawlLimitedTimeProducts(gender);

        return NextResponse.json({
            success: true,
            totalFound,
            newCount: newItems.length,
            newItems,
            soldOutCount: soldOutItems.length,
            soldOutItems,
            message: `Successfully crawled ${totalFound} limited-time items${gender ? ` for category: ${gender}` : ''}. Found ${newItems.length} new records and ${soldOutItems.length} sold out records.`
        });
    } catch (error: any) {
        console.error('Limited time crawl API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
