const QUERY_PRODUCT_ID_URL = 'https://d.uniqlo.cn/p/hmall-sc-service/search/searchWithDescriptionAndConditions/zh_CN';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  Referer: 'https://www.uniqlo.cn/',
};

const FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_CONCURRENCY = 4;

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...COMMON_HEADERS,
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

export type ProductSearchHit = {
  id: string;
  code: string;
  minPrice: number;
  originPrice: number;
  mainPic: string;
};

/**
 * Get Product ID by 6-digit code
 */
export async function getProductIdByCode(code: string): Promise<ProductSearchHit[] | null> {

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
    const data = await fetchJson(
      QUERY_PRODUCT_ID_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      15_000,
    );

    const hits = data?.resp?.[1];
    if (!Array.isArray(hits) || hits.length === 0) return null;

    return hits
      .map((product: any) => ({
        id: String(product?.productCode || ''),
        code: String(product?.code || ''),
        minPrice: Number(product?.minPrice) || 0,
        originPrice: Number(product?.originPrice) || 0,
        mainPic: typeof product?.mainPic === 'string' ? product.mainPic : '',
      }))
      .filter((hit: ProductSearchHit) => Boolean(hit.id) && Boolean(hit.code));
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
  try {
    const data = await fetchJson(url, {}, 12_000);
    if (!data) return null;
    return Array.isArray(data?.rows) ? data.rows : [];
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
    return await fetchJson(
      STOCK_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      12_000,
    );
  } catch (error) {
    console.error('getStockByProductId error:', error);
    return null;
  }
}

/**
 * Orchestrator: Get Product Stock by Code (Description ID)
 * Matches ProductService.getProductStockByDescriptionIdOld
 * Returns an array of product info
 */
export async function getProductInfoByCode(code: string) {

  // 1. Get Product IDs
  const productList = await getProductIdByCode(code);
  if (!productList || productList.length === 0) return null;

  const resolved = await mapWithConcurrency(productList, DEFAULT_CONCURRENCY, async (productData) => {
    const productId = productData.id;

    // 2. Get Stock + 3. Get Details (parallel)
    const [stockData, details] = await Promise.all([
      getStockByProductId(productId),
      getDetailByProductId(productId),
    ]);

    if (!stockData?.resp?.[0]) return null;
    if (!details || details.length === 0) return null;

    const stockMap = stockData.resp[0];
    const skuStocks = stockMap.skuStocks || {};
    const expressSkuStocks = stockMap.expressSkuStocks || {};

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
      mainPic: productData.mainPic,
      items,
      rawStock: stockMap,
    };
  });

  const results = resolved.filter(Boolean);
  return results.length > 0 ? results : null;
}
