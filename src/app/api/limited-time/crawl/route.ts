import { NextResponse } from 'next/server';
import {
    crawlLimitedTimeProducts,
    isLimitedTimeUpstreamError
} from '@/lib/limited-time';

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
    } catch (error: unknown) {
        console.error('Limited time crawl API error:', error);

        if (isLimitedTimeUpstreamError(error)) {
            return NextResponse.json({
                success: false,
                code: error.code,
                error: error.message,
                upstreamStatus: error.upstreamStatus,
                upstreamServer: error.upstreamServer,
                requestId: error.requestId
            }, { status: error.httpStatus });
        }

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 });
    }
}
