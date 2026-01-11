import { supabase } from './supabase';
import { sendWxNotification } from './wxpush';

const CONFIG_URL = 'https://www.uniqlo.cn/data/config_1/zh_CN/super-u_951462.json';
const PRODUCT_DETAIL_URL = 'https://www.uniqlo.cn/data/products/spu/zh_CN';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

// Indicators in the JSON configuration that mark the end of a category's product list
const CATEGORY_INDICATORS: Record<string, string> = {
    'SALE_W': '女装',
    'SALE_M': '男装',
    'SALE_K': '童装',
    'SALE_B': '婴幼儿装'
};

// Common headers for all requests
const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.uniqlo.cn/'
};

/**
 * Standardize gender values from Uniqlo API to UI display values
 */
function standardizeGender(rawGender: string): string {
    const gender = (rawGender || '').toLowerCase();
    // Prioritize Baby/Kids because they might contain gender words (e.g. "女童")
    if (gender.includes('baby') || gender.includes('infant') || gender.includes('幼')) return '婴幼儿装';
    if (gender.includes('kids') || gender.includes('child') || gender.includes('kid') || gender.includes('童')) return '童装';

    if (gender.includes('women') || gender.includes('woman') || gender.includes('女')) return '女装';
    if (gender.includes('men') || gender.includes('man') || gender.includes('男')) return '男装';

    return rawGender || '未知';
}

/**
 * Clean string: trim and normalize spaces
 * 清理字符串:去除前后空格并标准化内部空格
 */
function cleanString(str: any): string {
    if (!str) return '';
    return String(str).trim().replace(/\s+/g, ' ');
}

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
    stock_status?: string;   // 库存状态 ('new': 新增库存, 'old': 现有库存)
    gender: string;          // 性别
    sku_id: string;          // SKU ID (唯一SKU标识，例如 u0000000066997001)
}

/**
 * Get Product Codes from Config
 * 从配置接口获取所有产品代码列表，支持按性别分类过滤
 */
export async function getProductCodesFromConfig(targetGender?: string): Promise<string[]> {
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

        // --- Dynamic Category Mapping Logic ---
        // Group sections into category buckets based on the appearance of 'SALE_W/M/K/B' markers
        const categoryGroups: Record<string, string[]> = {};
        let currentGroupSections: string[] = [];

        // Sort keys numerically (section01, section02...) to process in visual order
        const sortedKeys = Object.keys(configData).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''), 10);
            const numB = parseInt(b.replace(/\D/g, ''), 10);
            return numA - numB;
        });

        for (const key of sortedKeys) {
            currentGroupSections.push(key);
            const sectionContent = JSON.stringify(configData[key]);

            // Check if this section contains any category marker (e.g., "SALE_W")
            let foundMarker: string | null = null;
            for (const marker in CATEGORY_INDICATORS) {
                if (sectionContent.includes(marker)) {
                    foundMarker = CATEGORY_INDICATORS[marker];
                    break;
                }
            }

            // If a marker is found, it closes the current category group
            if (foundMarker) {
                categoryGroups[foundMarker] = [...currentGroupSections];
                currentGroupSections = []; // Reset for next group
            }
        }

        // Determine which sections to process based on targetGender
        let sectionsToProcess: string[] = [];
        if (targetGender && categoryGroups[targetGender]) {
            sectionsToProcess = categoryGroups[targetGender];
            console.log(`[Crawler] Target category "${targetGender}" identified. Processing ${sectionsToProcess.length} dynamically discovered sections.`);
        } else {
            // If no target or category not found, process everything
            sectionsToProcess = sortedKeys;
        }
        // --------------------------------------

        // Extract product codes from selected sections
        sectionsToProcess.forEach(sectionKey => {
            const section = configData[sectionKey];
            if (!section) return;

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
        });

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
        const rawGender = summary.sex || summary.gDeptValue || '未知';
        const gender = standardizeGender(rawGender);
        const itemCode = summary.code || summary.oms_productCode || '';



        // Gender filter: only check stock if gender matches target
        // targetGender is already standardized (e.g., '女装')
        if (targetGender && gender !== targetGender && !gender.includes(targetGender)) {
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
                    product_id: cleanString(productCode),
                    code: cleanString(itemCode),
                    name: cleanString(productName),
                    color: cleanString(row.style || row.styleText || ''),
                    size: cleanString(row.size || row.sizeText || ''),
                    price: varyPrice,
                    min_price: minPrice,
                    origin_price: originPrice,
                    stock: stockCount,
                    gender: cleanString(gender),
                    sku_id: cleanString(skuId)
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
 * Save crawled items to database in batches, handling new items and sold-out items
 * 分批处理商品入库：入库新商品，删除已售罄/下架商品
 */
async function saveCrawledItems(items: CrawledItem[], targetGender?: string): Promise<{ newItems: CrawledItem[], soldOutItems: CrawledItem[] }> {
    if (items.length === 0 && !targetGender) {
        return { newItems: [], soldOutItems: [] };
    }

    // 1. Fetch oldList from database for comparison
    // NOTE: Supabase has a default limit of 1000 rows, we need to fetch all data
    let allOldData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        let query = supabase
            .from('crawled_products')
            .select('*')
            .range(from, from + pageSize - 1);

        if (targetGender) {
            query = query.filter('gender', 'ilike', `%${targetGender}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching existing items for comparison:', error);
            break;
        }

        if (data && data.length > 0) {
            allOldData = allOldData.concat(data);
            from += pageSize;
            hasMore = data.length === pageSize; // If less than pageSize, we've reached the end
        } else {
            hasMore = false;
        }
    }

    const oldList = allOldData as CrawledItem[];
    console.log(`[Database] Fetched ${oldList.length} existing items for comparison`);
    const newList = items;

    // Normalize string for comparison: trim, lowercase, remove extra spaces
    const normalizeString = (str: any): string => {
        if (!str) return '';
        return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
    };

    // Create keys for comparison: prefer sku_id, fallback to code-size-color (normalized)
    const getCompareKey = (item: any) => {
        // Priority 1: Use sku_id if available (most reliable)
        if (item.sku_id) {
            return `sku:${normalizeString(item.sku_id)}`;
        }

        // Priority 2: Use normalized code-size-color combination
        const code = normalizeString(item.code);
        const size = normalizeString(item.size);
        const color = normalizeString(item.color);
        return `combo:${code}|||${size}|||${color}`;
    };

    const oldMap = new Map(oldList.map(item => [getCompareKey(item), item]));
    const newMap = new Map(newList.map(item => [getCompareKey(item), item]));

    // Debug: Log sample keys for verification
    if (oldList.length > 0 && newList.length > 0) {
        console.log('[Debug] Sample old key:', getCompareKey(oldList[0]));
        console.log('[Debug] Sample new key:', getCompareKey(newList[0]));
        console.log('[Debug] Old map size:', oldMap.size, 'New map size:', newMap.size);

        // Check for potential duplicates in the comparison
        const duplicateCheck = newList.filter(item => oldMap.has(getCompareKey(item)));
        console.log('[Debug] Matching items found:', duplicateCheck.length);
    }

    // 2. Identify newItems (in newList but not in oldList)
    const newItems = newList.filter(item => !oldMap.has(getCompareKey(item)));

    // 3. Identify existingItems (in both oldList and newList) - need to update to 'old'
    const existingItems = newList.filter(item => oldMap.has(getCompareKey(item)));

    // 4. Identify soldOutItems (in oldList but not in newList)
    const soldOutItems = oldList.filter(item => !newMap.has(getCompareKey(item)));

    console.log(`Inventory Sync: Total Found=${newList.length}, Existing=${oldList.length}, New=${newItems.length}, Existing=${existingItems.length}, SoldOut=${soldOutItems.length}`);

    // 5. Batch Delete soldOutItems
    if (soldOutItems.length > 0) {
        console.log(`Deleting ${soldOutItems.length} sold-out items...`);
        // Batch deletion might be needed if there are thousands, but usually a few hundreds is fine with in()
        const idsToDelete = soldOutItems.map(item => (item as any).id).filter(Boolean);

        if (idsToDelete.length > 0) {
            // If the table has IDs, use IDs for safety. If not, use composite match (more complex)
            // Our schema has id SERIAL PRIMARY KEY
            for (let i = 0; i < idsToDelete.length; i += 100) {
                const batchIds = idsToDelete.slice(i, i + 100);
                const { error } = await supabase.from('crawled_products').delete().in('id', batchIds);
                if (error) console.error('Error deleting sold-out items:', error);
            }
        } else {
            // Fallback to composite key deletion if no ID (not recommended for performance)
            for (const item of soldOutItems) {
                await supabase.from('crawled_products')
                    .delete()
                    .match({ code: item.code, size: item.size, color: item.color });
            }
        }
    }

    // 6. Batch Update existingItems to set stock_status = 'old'
    if (existingItems.length > 0) {
        console.log(`Updating ${existingItems.length} existing items to 'old' status...`);

        // Batch update using upsert for better performance
        const batchSize = 100;
        for (let i = 0; i < existingItems.length; i += batchSize) {
            const batch = existingItems.slice(i, i + batchSize);
            const updates = batch.map(item => {
                const oldItem = oldMap.get(getCompareKey(item));
                return {
                    id: (oldItem as any).id,
                    product_id: cleanString(item.product_id),
                    code: cleanString(item.code),
                    name: cleanString(item.name),
                    color: cleanString(item.color),
                    size: cleanString(item.size),
                    price: item.price,
                    min_price: item.min_price,
                    origin_price: item.origin_price,
                    stock: item.stock,
                    stock_status: 'old',
                    gender: cleanString(item.gender),
                    sku_id: cleanString(item.sku_id)
                };
            }).filter(item => item.id); // Only include items with valid IDs

            // Deduplicate by ID to prevent "cannot affect row a second time" error
            const uniqueUpdates = Array.from(
                new Map(updates.map(item => [item.id, item])).values()
            );

            if (uniqueUpdates.length > 0) {
                const { error } = await supabase
                    .from('crawled_products')
                    .upsert(uniqueUpdates, { onConflict: 'id' });

                if (error) {
                    console.error('Error batch updating existing items:', error);
                }
            }
        }
    }

    // 7. Batch Insert newItems with stock_status = 'new'
    const successfullySavedItems: CrawledItem[] = [];
    if (newItems.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < newItems.length; i += batchSize) {
            const batch = newItems.slice(i, i + batchSize);
            const dbBatch = batch.map(item => ({
                product_id: cleanString(item.product_id),
                code: cleanString(item.code),
                name: cleanString(item.name),
                color: cleanString(item.color),
                size: cleanString(item.size),
                price: item.price,
                min_price: item.min_price,
                origin_price: item.origin_price,
                stock: item.stock,
                stock_status: 'new',
                gender: cleanString(item.gender),
                sku_id: cleanString(item.sku_id)
            }));

            const { error } = await supabase.from('crawled_products').insert(dbBatch);
            if (error) {
                console.error(`Error saving new items batch:`, error);
            } else {
                successfullySavedItems.push(...batch);
            }
        }
    }

    return {
        newItems: successfullySavedItems,
        soldOutItems: soldOutItems
    };
}

/**
 * Main crawler function
 * 主爬虫函数：获取产品列表、处理每个产品、保存到数据库
 */
export async function crawlUniqloProducts(targetGender?: string): Promise<{ totalFound: number, newItems: CrawledItem[], soldOutItems: CrawledItem[] }> {
    console.log(`Starting Uniqlo crawl${targetGender ? ` for gender: ${targetGender}` : ''}...`);

    try {
        // 1. Get all product codes (optionally filtered by category section logic)
        const productCodes = await getProductCodesFromConfig(targetGender);
        console.log(`Found ${productCodes.length} unique product codes.`);

        if (productCodes.length === 0) {
            console.log('No product codes found.');
            return { totalFound: 0, newItems: [], soldOutItems: [] };
        }

        const allResults: CrawledItem[] = [];
        let processedCount = 0;
        let successCount = 0;

        // 2. Process each product with concurrency limit
        const CONCURRENCY_LIMIT = 20;

        // Custom Concurrency Handler
        const runWithConcurrency = async <T>(items: T[], fn: (item: T) => Promise<void>, limit: number) => {
            const results = [];
            const executing = new Set<Promise<void>>();

            for (const item of items) {
                const p = Promise.resolve().then(() => fn(item));
                executing.add(p);

                const clean = () => executing.delete(p);
                p.then(clean).catch(clean);

                if (executing.size >= limit) {
                    await Promise.race(executing);
                }
            }
            return Promise.all(executing);
        };

        await runWithConcurrency(productCodes, async (code) => {
            // Add small random delay to prevent exact burst
            const randomDelay = Math.floor(Math.random() * 50);
            await new Promise(resolve => setTimeout(resolve, randomDelay));

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
        }, CONCURRENCY_LIMIT);

        console.log(`Processed ${processedCount}/${productCodes.length} products.`);
        console.log(`Successfully fetched ${successCount} products with details.`);
        console.log(`Found ${allResults.length} in-stock items.`);

        // 3. Save to database results (New items vs Sold out)
        let newItems: CrawledItem[] = [];
        let soldOutItems: CrawledItem[] = [];

        console.log('Checking inventory changes and updating database...');
        const result = await saveCrawledItems(allResults, targetGender);
        newItems = result.newItems;
        soldOutItems = result.soldOutItems;

        console.log(`Crawl result: Total Found=${allResults.length}, New Items=${newItems.length}, Sold Out Items=${soldOutItems.length}`);

        if (newItems.length > 0) {
            console.log('\n=== Newly Added Items ===');
            newItems.forEach(item => {
                console.log(`[NEW] ${item.name} | Color: ${item.color} | Size: ${item.size} | Code: ${item.code} | Price: ${item.price}`);
            });
            console.log('=========================\n');
        }

        // --- Notification Logic for Super Selection ---
        if (newItems.length > 0) {
            try {
                // 1. Fetch all enabled subscriptions that include this category
                const { data: rawSubscriptions, error: subError } = await supabase
                    .from('super_push_subscriptions')
                    .select('id, user_id, genders')
                    .eq('is_enabled', true)
                    .contains('genders', [targetGender]);

                if (subError) throw subError;

                if (rawSubscriptions && rawSubscriptions.length > 0) {
                    // 2. Fetch user details separately to avoid join relationship issues
                    const userIds = Array.from(new Set(rawSubscriptions.map(s => s.user_id)));
                    const { data: users, error: userError } = await supabase
                        .from('users')
                        .select('id, username, wx_user_id')
                        .in('id', userIds);

                    if (userError) throw userError;

                    // 3. Map users for easy lookup
                    const userMap = (users || []).reduce((acc, user) => {
                        acc[user.id] = user;
                        return acc;
                    }, {} as Record<string, any>);

                    // 4. Merge results
                    const subscriptions = rawSubscriptions.map(sub => ({
                        ...sub,
                        users: userMap[sub.user_id]
                    }));

                    // Group new items by code for individual notifications
                    const itemsByCode = newItems.reduce((acc, item) => {
                        if (!acc[item.code]) acc[item.code] = [];
                        acc[item.code].push(item);
                        return acc;
                    }, {} as Record<string, CrawledItem[]>);

                    console.log(`[Notification] Found ${subscriptions.length} eligible subscribers for category "${targetGender}".`);

                    for (const sub of subscriptions) {
                        const user = sub.users as any;
                        if (!user?.wx_user_id) {
                            console.log(`[Notification] User ${user?.username || sub.user_id} has no wx_user_id, skipping.`);
                            continue;
                        }

                        for (const code in itemsByCode) {
                            const items = itemsByCode[code];
                            const firstItem = items[0];
                            const title = `超值精选新增：${firstItem.name}`;

                            // List all specifications (color and size)
                            const specsList = items.map(item => `${item.color} ${item.size}`).join('、');
                            const priceInfo = firstItem.origin_price && parseFloat(firstItem.origin_price as any) > parseFloat(firstItem.price as any)
                                ? ` (原价: ¥${firstItem.origin_price})`
                                : '';
                            const content = `发现货号 ${code} 有新库存！包含 ${items.length} 个规格：${specsList}。价格: ¥${firstItem.price}${priceInfo}。`;

                            // Send notification to the same detail page as favorites notifications
                            const baseUrl = process.env.WECHAT_BASE_URL;
                            const notificationUrl = `${baseUrl}/notification`;
                            const notificationResult = await sendWxNotification(
                                user.wx_user_id,
                                title,
                                content,
                                notificationUrl
                            );

                            if (notificationResult.success) {
                                console.log(`[Notification] Sent to ${user.username} for code ${code}`);
                            } else {
                                console.error(`[Notification] Failed to send to ${user.username} for code ${code}:`, notificationResult.error);
                            }
                        }
                    }
                }
            } catch (notifyError) {
                console.error('[Notification] Error in super selection notification flow:', notifyError);
            }
        }
        // -----------------------------------------------

        return {
            newItems,
            soldOutItems,
            totalFound: allResults.length
        };
    } catch (error) {
        console.error('Crawler failed:', error);
        throw error;
    }
}
