import { NextRequest, NextResponse } from 'next/server';
import { getProductInfoByCode } from '@/lib/uniqlo';
import { withApiLogging } from '@/lib/api-logger';

export const GET = withApiLogging(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: '商品编号不能为空' }, { status: 400 });
    }

    try {
        const data = await getProductInfoByCode(code);

        if (!data) {
            return NextResponse.json({ error: '搜索结果不存在' }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ error: '服务器错误' }, { status: 500 });
    }
});
