import { NextResponse } from 'next/server';
import { crawlUniqloProducts } from '@/lib/crawler';

export async function POST() {
    try {
        const results = await crawlUniqloProducts();
        return NextResponse.json({
            success: true,
            count: results.length,
            message: `Successfully crawled ${results.length} items.`
        });
    } catch (error: any) {
        console.error('Crawl API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
