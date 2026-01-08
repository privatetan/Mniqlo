import { NextResponse } from 'next/server';
import { crawlUniqloProducts } from '@/lib/crawler';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const gender = searchParams.get('gender') || undefined;

        const results = await crawlUniqloProducts(gender);
        return NextResponse.json({
            success: true,
            count: results.length,
            message: `Successfully crawled ${results.length} items${gender ? ` for gender: ${gender}` : ''}.`
        });
    } catch (error: any) {
        console.error('Crawl API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
