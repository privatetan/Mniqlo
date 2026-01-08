import { supabase } from './supabase';

const CONFIG_URL = 'https://www.uniqlo.cn/data/config_1/zh_CN/super-u_951462.json';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

export interface CrawledItem {
    productCode: string;
    productId: string;
    productName: string;
    discount: string;
    currentPrice: number;
    originalPrice: number;
    stock: number;
    color: string;
    size: string;
}

export async function crawlUniqloProducts() {
    console.log('Starting Uniqlo crawl...');

    try {
        // 1. Get Product Code List
        const configRes = await fetch(CONFIG_URL);
        const configData = await configRes.json();

        const productCodes: string[] = [];

        // Extract product codes from sections
        for (const sectionKey in configData) {
            const section = configData[sectionKey];
            if (section.componentType === 'productRecommed' || section.componentType === 'productRecommed_v2') {
                if (Array.isArray(section.props)) {
                    section.props.forEach((propGroup: any) => {
                        if (Array.isArray(propGroup.props)) {
                            propGroup.props.forEach((p: any) => {
                                if (p.productCode) {
                                    productCodes.push(p.productCode);
                                }
                            });
                        }
                    });
                }
            }
        }

        const uniqueProductCodes = Array.from(new Set(productCodes));
        console.log(`Found ${uniqueProductCodes.length} unique product codes.`);

        const results: CrawledItem[] = [];

        // 2. Iterate and fetch details/stock
        let processedCount = 0;
        let detailErrors = 0;
        let stockErrors = 0;

        for (const code of uniqueProductCodes) {
            try {
                const detailUrl = `https://www.uniqlo.cn/data/products/spu/zh_CN/${code}.json`;
                const detailRes = await fetch(detailUrl);
                if (!detailRes.ok) {
                    console.log(`[${code}] Detail fetch failed: ${detailRes.status}`);
                    detailErrors++;
                    continue;
                }

                const detailData = await detailRes.json();
                const rows = detailData.rows || [];
                if (rows.length === 0) {
                    console.log(`[${code}] No rows in detail data`);
                    continue;
                }

                const productName = rows[0].name;
                const productId = rows[0].productId.substring(0, 13); // Uniqlo product IDs are usually first 13 chars for stock query

                // Fetch stock
                const stockRes = await fetch(STOCK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        distribution: 'EXPRESS',
                        productCode: productId,
                        type: 'DETAIL',
                    }),
                });

                const stockData = await stockRes.json();

                // Debug: Log first stock response
                if (processedCount === 0) {
                    console.log(`[DEBUG] First stock API response for ${code}:`, JSON.stringify(stockData, null, 2));
                }

                if (!stockData.resp || !stockData.resp[0]) {
                    console.log(`[${code}] Invalid stock response format. Response:`, stockData);
                    stockErrors++;
                    continue;
                }

                const stockMap = stockData.resp[0].skuStocks || {};
                const expressSkuStocks = stockData.resp[0].expressSkuStocks || {};

                let productHasStock = false;

                // Map details and filter by stock
                for (const row of rows) {
                    const skuId = row.productId;
                    const stockCount = (parseInt(stockMap[skuId], 10) || 0) + (parseInt(expressSkuStocks[skuId], 10) || 0);

                    if (stockCount > 0) {
                        productHasStock = true;
                        const originalPrice = parseFloat(row.originPrice);
                        const currentPrice = parseFloat(row.minPrice);
                        const discount = originalPrice > 0 ? (currentPrice / originalPrice * 10).toFixed(1) + '折' : 'N/A';

                        results.push({
                            productCode: code,
                            productId: skuId,
                            productName: productName,
                            discount: discount,
                            currentPrice: currentPrice,
                            originalPrice: originalPrice,
                            stock: stockCount,
                            color: row.style,
                            size: row.size
                        });
                    }
                }

                if (!productHasStock && processedCount < 3) {
                    console.log(`[${code}] No stock. StockMap keys:`, Object.keys(stockMap).length, 'ExpressStock keys:', Object.keys(expressSkuStocks).length);
                }

                processedCount++;
            } catch (err) {
                console.error(`Error crawling code ${code}:`, err);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        console.log(`Processed ${processedCount}/${uniqueProductCodes.length} products. Detail errors: ${detailErrors}, Stock errors: ${stockErrors}`);

        console.log(`Found ${results.length} in-stock items. Saving to database...`);

        // 3. Save to database
        if (results.length > 0) {
            const dbItems = results.map(item => ({
                product_code: item.productCode,
                product_id: item.productId,
                product_name: item.productName,
                discount: item.discount,
                current_price: item.currentPrice,
                original_price: item.originalPrice,
                stock: item.stock,
                color: item.color,
                size: item.size
            }));

            const { error } = await supabase
                .from('crawled_products')
                .insert(dbItems);

            if (error) {
                console.error('Error saving to Supabase:', error);
                throw error;
            }
        }

        return results;
    } catch (error) {
        console.error('Crawler failed:', error);
        throw error;
    }
}
