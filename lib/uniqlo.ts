
interface PageInfo {
    page: number;
    pageSize: number;
    withSideBar: string;
}

interface PriceRange {
    low: number;
    high: number;
}

export interface StockItem {
    type: 'BPL' | 'SKU' | 'EXPRESS';
    stock: number;
}

export interface ColorStock {
    style: string; // Color name/code
    stock: number; // Aggregate or specific stock
    breakdown: StockItem[];
}

export interface SizeGroup {
    size: string;
    colors: ColorStock[];
}

const QUERY_PRODUCT_ID_URL = 'https://d.uniqlo.cn/p/hmall-sc-service/search/searchWithDescriptionAndConditions/zh_CN';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

/**
 * Get Product ID by 6-digit code
 */
export async function getProductIdByCode(code: string): Promise<string | null> {
    const body = {
        belongTo: 'pc',
        description: code,
        insiteDescription: code,
        pageInfo: { page: 1, pageSize: 24, withSideBar: 'Y' },
        priceRange: { low: 0, high: 0 },
        rank: 'overall',
        searchFlag: true,
    };

    try {
        const res = await fetch(QUERY_PRODUCT_ID_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(body),
        });

        // The API might return text that we need to parse or check for u00000000
        // Based on Java: if (!result.contains("u00000000")) return null;
        const text = await res.text();
        console.log(`[Diff Debug] Product ID API Response for ${code}:`, res.status, text.substring(0, 200));
        // Although standard fetch usually returns JSON, the Java code treats it as string first.
        // Let's see if we can parse it as JSON.

        // The Java logic: finds "u00000000" and takes 14 chars.
        // This suggests the response structure might be complex or they are just regexing the ID.
        // Let's try to parse as JSON first, as that's safer.

        if (!text.includes('u00000000')) {
            return null;
        }

        const index = text.indexOf('u00000000');
        return text.substring(index, index + 14);
    } catch (error) {
        console.error('Error fetching product ID:', error);
        return null;
    }
}

/**
 * Get Product Details by Product ID
 * Matches CommonService.getDetailByProductId
 */
export async function getDetailByProductId(productId: string) {
    const url = `https://www.uniqlo.cn/data/products/spu/zh_CN/${productId}.json`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.rows || [];
    } catch (error) {
        console.error('Error fetching details:', error);
        return [];
    }
}

/**
 * Get Stock by Product ID
 * Matches CommonService.getStockByProductId
 */
export async function getStockByProductId(productId: string) {
    const body = {
        distribution: 'EXPRESS',
        productCode: productId,
        type: 'DETAIL',
    };

    try {
        const res = await fetch(STOCK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Error fetching stock:', error);
        return null;
    }
}

/**
 * Orchestrator: Get Product Stock by Code (Description ID)
 * Matches ProductService.getProductStockByDescriptionIdOld
 */
export async function getProductInfoByCode(code: string) {
    // 1. Get Product ID
    const productId = await getProductIdByCode(code);
    if (!productId) return null;

    // 2. Get Stock
    const stockData = await getStockByProductId(productId);
    if (!stockData || !stockData.resp || !stockData.resp[0]) return null;

    const stockMap = stockData.resp[0];
    const bplStocks = stockMap.bplStocks || {};
    const skuStocks = stockMap.skuStocks || {};
    const expressSkuStocks = stockMap.expressSkuStocks || {};

    // 3. Get Details
    const details = await getDetailByProductId(productId);
    if (!details || details.length === 0) return null;

    const items: { size: string; style: string; type: string; stock: number }[] = [];

    for (const row of details) {
        const pid = row.productId;
        const size = row.size;
        const style = row.style;

        // BPL
        // if (bplStocks[pid] !== undefined) {
        //     items.push({ size, style, type: 'BPL', stock: bplStocks[pid] });
        // }
        // SKU
        // if (skuStocks[pid] !== undefined) {
        //     items.push({ size, style, type: 'SKU', stock: skuStocks[pid] });
        // }
        // EXPRESS
        if (expressSkuStocks[pid] !== undefined) {
            items.push({ size, style, type: 'EXPRESS', stock: expressSkuStocks[pid] });
        }
    }

    return {
        productId,
        productName: details[0]?.name || '',
        items: items,
        rawStock: stockMap
    };
}
