const QUERY_PRODUCT_ID_URL = 'https://d.uniqlo.cn/p/hmall-sc-service/search/searchWithDescriptionAndConditions/zh_CN';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

/**
 * Get Product ID by 6-digit code
 */
export async function getProductIdByCode(code: string): Promise<{ id: string; code: string; minPrice: number; originPrice: number } | null> {

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

        const data = await res.json();

        if (!data.resp || !data.resp[1] || data.resp[1].length === 0) {
            return null;
        }

        const product = data.resp[1][0];
        return {
            id: product.productCode,
            code: product.code,
            minPrice: parseFloat(product.minPrice),
            originPrice: parseFloat(product.originPrice)
        };
    } catch (error) {
        console.error('getProductIdByCode error:', error);
        return null;
    }
}

/**
 * Get Product Details by Product ID
 * Matches CommonService.getDetailByProductId
 */
export async function getDetailByProductId(productId: string) {
    const url = `https://www.uniqlo.cn/data/products/spu/zh_CN/${productId}.json`;
    console.log("[API DEBUGG]", url);
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://www.uniqlo.cn/'
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.rows || [];
    } catch (error) {
        console.error('getDetailByProductId error:', error);
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
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://www.uniqlo.cn/'
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('getStockByProductId error:', error);
        return null;
    }
}

/**
 * Orchestrator: Get Product Stock by Code (Description ID)
 * Matches ProductService.getProductStockByDescriptionIdOld
 */
export async function getProductInfoByCode(code: string) {

    // 1. Get Product ID
    const productData = await getProductIdByCode(code);
    if (!productData) return null;
    const productId = productData.id;

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

        let totalStock = 0;

        if (skuStocks[pid] !== undefined) {
            totalStock += parseInt(skuStocks[pid], 10) || 0;
        }
        if (expressSkuStocks[pid] !== undefined) {
            totalStock += parseInt(expressSkuStocks[pid], 10) || 0;
        }

        if (totalStock > 0 || skuStocks[pid] !== undefined || expressSkuStocks[pid] !== undefined) {
            items.push({ size, style, type: 'Sum', stock: totalStock });
        }
    }

    return {
        productId: productData.id,
        code: productData.code,
        productName: details[0]?.name || '',
        price: details[0]?.varyPrice || 0,
        minPrice: productData.minPrice,
        originPrice: productData.originPrice,
        items: items,
        rawStock: stockMap
    };
}
