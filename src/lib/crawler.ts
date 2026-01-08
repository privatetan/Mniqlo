import { supabase } from './supabase';

const CONFIG_URL = 'https://www.uniqlo.cn/data/config_1/zh_CN/super-u_951462.json';
const PRODUCT_DETAIL_URL = 'https://www.uniqlo.cn/data/products/spu/zh_CN';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

// Common headers for all requests
const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.uniqlo.cn/'
};

export interface CrawledItem {
    product_id: string;      // 商品ID (产品代码, 例如 u0000000066997)
    code: string;            // 货号 (6位数字代码)
    name: string;            // 商品名称
    color: string;           // 颜色 (style)
    size: string;            // 尺寸
    price: number;           // 当前价格 (varyPrice)
    min_price: number;       // 最低价格
    origin_price: number;    // 原价
    stock: number;           // 库存数量
    gender: string;          // 性别
    sku_id: string;          // SKU ID (唯一SKU标识，例如 u0000000066997001)
}

/**
 * Get Product Codes from Config
 * 从配置接口获取所有产品代码列表
 */
export async function getProductCodesFromConfig(): Promise<string[]> {
    try {
        const res = await fetch(CONFIG_URL, {
            headers: COMMON_HEADERS
        });

        if (!res.ok) {
            console.error('Failed to fetch config:', res.status);
            return [];
        }

        const configData = await res.json();
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

        return Array.from(new Set(productCodes));
    } catch (error) {
        console.error('getProductCodesFromConfig error:', error);
        return [];
    }
}

/**
 * Get Product Detail by Product Code
 * 通过产品代码获取商品详情
 */
export async function getProductDetailByCode(productCode: string) {
    const url = `${PRODUCT_DETAIL_URL}/${productCode}.json`;

    try {
        const res = await fetch(url, {
            headers: COMMON_HEADERS
        });

        if (!res.ok) {
            console.log(`[${productCode}] Detail fetch failed: ${res.status}`);
            return null;
        }

        const data = await res.json();
        return {
            summary: data.summary || {},
            rows: data.rows || []
        };
    } catch (error) {
        console.error(`getProductDetailByCode error for ${productCode}:`, error);
        return null;
    }
}

/**
 * Get Stock by Product ID
 * 通过产品ID获取库存信息
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
                ...COMMON_HEADERS
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error(`getStockByProductId error for ${productId}:`, error);
        return null;
    }
}

/**
 * Process single product and extract in-stock items
 * 处理单个产品并提取有库存的商品
 */
async function processProduct(productCode: string, targetGender?: string): Promise<CrawledItem[]> {
    const results: CrawledItem[] = [];

    try {
        // 1. Get product detail
        const detailData = await getProductDetailByCode(productCode);
        if (!detailData || detailData.rows.length === 0) {
            return results;
        }

        const { summary, rows } = detailData;

        // Extract product information from summary
        const productName = summary.name || rows[0].name || '';
        const gender = summary.sex || summary.gDeptValue || '未知';
        const itemCode = summary.code || summary.oms_productCode || '';

        // Gender filter: only check stock if gender matches target
        if (targetGender && !gender.includes(targetGender)) {
            // console.log(`[${productCode}] Skipping: Gender "${gender}" does not match target "${targetGender}"`);
            return results;
        }

        // 2. Get stock information
        // Use productCode directly, same as uniqlo.ts
        const stockData = await getStockByProductId(productCode);

        if (!stockData || !stockData.resp || !stockData.resp[0]) {
            return results;
        }

        const stockMap = stockData.resp[0].skuStocks || {};
        const expressSkuStocks = stockData.resp[0].expressSkuStocks || {};

        // 3. Process each SKU and filter by stock
        for (const row of rows) {
            const skuId = row.productId;
            const stockCount = (parseInt(stockMap[skuId], 10) || 0) + (parseInt(expressSkuStocks[skuId], 10) || 0);

            if (stockCount > 0) {
                const originPrice = parseFloat(row.originPrice || summary.originPrice || 0);
                const varyPrice = parseFloat(row.varyPrice || row.minPrice || summary.minVaryPrice || 0);
                const minPrice = parseFloat(row.minPrice || summary.minPrice || varyPrice);

                results.push({
                    product_id: productCode,
                    code: itemCode,
                    name: productName,
                    color: row.style || row.styleText || '',
                    size: row.size || row.sizeText || '',
                    price: varyPrice,
                    min_price: minPrice,
                    origin_price: originPrice,
                    stock: stockCount,
                    gender: gender,
                    sku_id: skuId
                });
            }
        }

        return results;
    } catch (error) {
        console.error(`Error processing product ${productCode}:`, error);
        return results;
    }
}

/**
 * Save crawled items to database in batches
 * 分批保存爬取的商品到数据库，避免大批量插入导致连接断开
 */
async function saveCrawledItems(items: CrawledItem[]): Promise<boolean> {
    if (items.length === 0) {
        return true;
    }

    const batchSize = 50;
    let allSuccess = true;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize).map(item => ({
            product_id: item.product_id,
            code: item.code,
            name: item.name,
            color: item.color,
            size: item.size,
            price: item.price,
            min_price: item.min_price,
            origin_price: item.origin_price,
            stock: item.stock,
            gender: item.gender,
            sku_id: item.sku_id
        }));

        console.log(`Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)...`);

        const { error } = await supabase
            .from('crawled_products')
            .insert(batch);

        if (error) {
            console.error(`Error saving batch starting at index ${i}:`, error);
            allSuccess = false;
            // Record error but continue with next batch? 
            // Better to return false to indicate incomplete save
        }
    }

    return allSuccess;
}

/**
 * Main crawler function
 * 主爬虫函数：获取产品列表、处理每个产品、保存到数据库
 */
export async function crawlUniqloProducts(targetGender?: string) {
    console.log(`Starting Uniqlo crawl${targetGender ? ` for gender: ${targetGender}` : ''}...`);

    try {
        // 1. Get all product codes
        const productCodes = await getProductCodesFromConfig();
        console.log(`Found ${productCodes.length} unique product codes.`);

        if (productCodes.length === 0) {
            console.log('No product codes found.');
            return [];
        }

        const allResults: CrawledItem[] = [];
        let processedCount = 0;
        let successCount = 0;

        // 2. Process each product
        for (const code of productCodes) {
            const items = await processProduct(code, targetGender);

            if (items.length > 0) {
                allResults.push(...items);
                successCount++;
            }

            processedCount++;

            // Log progress every 10 products
            if (processedCount % 10 === 0) {
                console.log(`Progress: ${processedCount}/${productCodes.length} products processed, ${allResults.length} items with stock found`);
            }

            // Rate limiting: 150ms delay between requests
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        console.log(`Processed ${processedCount}/${productCodes.length} products.`);
        console.log(`Successfully fetched ${successCount} products with details.`);
        console.log(`Found ${allResults.length} in-stock items.`);

        // 3. Save to database
        if (allResults.length > 0) {
            console.log('Saving to database...');
            const saved = await saveCrawledItems(allResults);
            if (saved) {
                console.log('Successfully saved to database.');
            } else {
                console.error('Failed to save to database.');
            }
        }

        return allResults;
    } catch (error) {
        console.error('Crawler failed:', error);
        throw error;
    }
}
