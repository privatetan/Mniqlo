import { supabase } from './supabase';
import { sendWxNotification } from './wxpush';
import { getProductIdByCode } from './uniqlo';

const TIMELIMIT_PAGE_URL = 'https://www.uniqlo.cn/data/pages/timelimit.html.json';
const PRODUCT_DETAIL_URL = 'https://www.uniqlo.cn/data/products/spu/zh_CN';
const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';

export const LIMITED_TIME_CATEGORIES = ['女装', '男装', '中性/男女同款', '童装', '婴幼儿装'] as const;
export type LimitedTimeCategory = (typeof LIMITED_TIME_CATEGORIES)[number];

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.uniqlo.cn/'
};

type LimitedTimeSeed = {
    productCode: string;
    category: LimitedTimeCategory;
    productName: string;
    mainPic: string;
    price: number;
};

type LimitedTimeSeedGroups = Record<LimitedTimeCategory, LimitedTimeSeed[]>;

type SearchPriceSnapshot = {
    minPrice: number;
    originPrice: number;
    mainPic: string;
};

export interface LimitedTimeItem {
    product_id: string;
    code: string;
    name: string;
    color: string;
    size: string;
    price: number;
    min_price: number;
    origin_price: number;
    stock: number;
    stock_status?: string;
    gender: string;
    sku_id: string;
    main_pic?: string;
}

function cleanString(value: unknown): string {
    if (value == null) return '';
    return String(value).trim().replace(/\s+/g, ' ');
}

function isLimitedTimeCategory(value?: string | null): value is LimitedTimeCategory {
    return Boolean(value && LIMITED_TIME_CATEGORIES.includes(value as LimitedTimeCategory));
}

function createEmptySeedGroups(): LimitedTimeSeedGroups {
    return {
        '女装': [],
        '男装': [],
        '中性/男女同款': [],
        '童装': [],
        '婴幼儿装': [],
    };
}

function getSectionOrder(sectionKey: string): number {
    const match = sectionKey.match(/\d+/);
    return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

function getSortedSectionEntries(payload: Record<string, any>): Array<[string, any]> {
    return Object.entries(payload).sort((a, b) => getSectionOrder(a[0]) - getSectionOrder(b[0]));
}

function extractNavLabels(html: string): string[] {
    if (!html) return [];

    return Array.from(html.matchAll(/<li[^>]*class=["'][^"']*\bbtnn\b[^"']*["'][^>]*>\s*([\s\S]*?)\s*<\/li>/gi))
        .map(match => cleanString(match[1]).replace(/&nbsp;/gi, ' '))
        .filter(Boolean);
}

function mapCategoryFromNavLabel(label: string): LimitedTimeCategory | null {
    if (!label) return null;
    if (label.includes('婴幼儿')) return '婴幼儿装';
    if (label.includes('童装')) return '童装';
    if (label.includes('女装')) return '女装';
    if (label.includes('男装')) return '男装';
    return null;
}

function mapCategoryFromProductName(productName: string): LimitedTimeCategory | null {
    const normalized = cleanString(productName);
    if (!normalized) return null;

    if (normalized.includes('婴幼儿') || normalized.includes('宝宝')) return '婴幼儿装';
    if (normalized.startsWith('童装')) return '童装';
    if (normalized.includes('男女同款')) return '中性/男女同款';
    if (normalized.startsWith('女装')) return '女装';
    if (normalized.startsWith('男装')) return '男装';

    return null;
}

function dedupeSeedsByProductCode(seeds: LimitedTimeSeed[]): LimitedTimeSeed[] {
    return Array.from(
        new Map(
            seeds
                .filter(seed => Boolean(cleanString(seed.productCode)))
                .map(seed => [`${seed.category}:${cleanString(seed.productCode)}`, seed])
        ).values()
    );
}

const priceSnapshotCache = new Map<string, Promise<SearchPriceSnapshot | null>>();

async function getLimitedTimePriceSnapshot(code: string, productId: string): Promise<SearchPriceSnapshot | null> {
    const normalizedCode = cleanString(code);
    if (!normalizedCode) {
        return null;
    }

    if (!priceSnapshotCache.has(normalizedCode)) {
        priceSnapshotCache.set(normalizedCode, (async () => {
            const hits = await getProductIdByCode(normalizedCode);
            if (!hits || hits.length === 0) {
                return null;
            }

            const matchedHit =
                hits.find(hit => cleanString(hit.id) === cleanString(productId)) ||
                hits.find(hit => cleanString(hit.code) === normalizedCode) ||
                hits[0];

            if (!matchedHit) {
                return null;
            }

            return {
                minPrice: Number(matchedHit.minPrice) || 0,
                originPrice: Number(matchedHit.originPrice) || 0,
                mainPic: cleanString(matchedHit.mainPic)
            };
        })());
    }

    return await priceSnapshotCache.get(normalizedCode)!;
}

async function fetchLimitedTimeSeedGroups(): Promise<LimitedTimeSeedGroups> {
    const groups = createEmptySeedGroups();

    const res = await fetch(TIMELIMIT_PAGE_URL, {
        headers: COMMON_HEADERS
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch timelimit page config: ${res.status}`);
    }

    const pageData = await res.json();
    const navLabels = extractNavLabels(pageData?.section03?.props?.html || '');
    let productGroupIndex = 0;

    for (const [, section] of getSortedSectionEntries(pageData)) {
        if (section?.component !== 'ProductGroup') {
            continue;
        }

        const navCategory = mapCategoryFromNavLabel(navLabels[productGroupIndex] || '');
        productGroupIndex += 1;

        const items = Array.isArray(section?.props?.items) ? section.props.items : [];
        items.forEach((item: any) => {
            const category = mapCategoryFromProductName(item?.productName || '') || navCategory;
            if (!category) {
                return;
            }

            groups[category].push({
                productCode: cleanString(item?.productCode),
                category,
                productName: cleanString(item?.productName),
                mainPic: cleanString(item?.mainPic),
                price: Number(item?.price) || 0,
            });
        });
    }

    LIMITED_TIME_CATEGORIES.forEach(category => {
        groups[category] = dedupeSeedsByProductCode(groups[category]);
    });

    return groups;
}

async function getProductDetailByCode(productCode: string) {
    const url = `${PRODUCT_DETAIL_URL}/${productCode}.json`;

    const res = await fetch(url, {
        headers: COMMON_HEADERS
    });

    if (!res.ok) {
        return null;
    }

    const data = await res.json();
    return {
        summary: data.summary || {},
        rows: data.rows || []
    };
}

async function getStockByProductId(productId: string) {
    const body = {
        distribution: 'EXPRESS',
        productCode: productId,
        type: 'DETAIL',
    };

    const res = await fetch(STOCK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...COMMON_HEADERS
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        return null;
    }

    return await res.json();
}

async function processLimitedTimeSeed(seed: LimitedTimeSeed): Promise<LimitedTimeItem[]> {
    const results: LimitedTimeItem[] = [];

    try {
        const detailData = await getProductDetailByCode(seed.productCode);
        if (!detailData || detailData.rows.length === 0) {
            return results;
        }

        const { summary, rows } = detailData;
        const itemCode = cleanString(summary.code || summary.oms_productCode || '');
        const productName = cleanString(summary.name || rows[0]?.name || seed.productName);
        const priceSnapshot = await getLimitedTimePriceSnapshot(itemCode, seed.productCode);
        const mainPic = cleanString(priceSnapshot?.mainPic || summary.mainPic || seed.mainPic);

        const stockData = await getStockByProductId(seed.productCode);
        if (!stockData?.resp?.[0]) {
            return results;
        }

        const stockMap = stockData.resp[0].skuStocks || {};
        const expressSkuStocks = stockData.resp[0].expressSkuStocks || {};

        for (const row of rows) {
            const skuId = cleanString(row.productId);
            const stockCount = (parseInt(stockMap[skuId], 10) || 0) + (parseInt(expressSkuStocks[skuId], 10) || 0);

            if (stockCount <= 0) {
                continue;
            }

            const fallbackCurrentPrice = parseFloat(row.varyPrice || row.minPrice || summary.minVaryPrice || summary.minPrice || 0);
            const fallbackOriginPrice = parseFloat(row.originPrice || summary.originPrice || seed.price || 0);
            const minPrice = Number(priceSnapshot?.minPrice) > 0
                ? Number(priceSnapshot?.minPrice)
                : fallbackCurrentPrice;
            const varyPrice = minPrice > 0 ? minPrice : fallbackCurrentPrice;
            const originPrice = Number(priceSnapshot?.originPrice) > 0
                ? Number(priceSnapshot?.originPrice)
                : fallbackOriginPrice;

            results.push({
                product_id: cleanString(seed.productCode),
                code: itemCode,
                name: productName,
                color: cleanString(row.style || row.styleText || ''),
                size: cleanString(row.size || row.sizeText || ''),
                price: varyPrice,
                min_price: minPrice,
                origin_price: originPrice,
                stock: stockCount,
                stock_status: stockMap[skuId] ? 'old' : 'new',
                gender: seed.category,
                sku_id: skuId,
                main_pic: mainPic
            });
        }

        return results;
    } catch (error) {
        console.error(`[LimitedTime] Failed to process product ${seed.productCode}:`, error);
        return results;
    }
}

function normalizeCompareString(value: unknown): string {
    return cleanString(value).toLowerCase();
}

function getCompareKey(item: any): string {
    if (item?.sku_id) {
        return `sku:${normalizeCompareString(item.sku_id)}`;
    }

    return [
        'combo',
        normalizeCompareString(item?.code),
        normalizeCompareString(item?.size),
        normalizeCompareString(item?.color)
    ].join('|||');
}

async function saveLimitedTimeItems(
    items: LimitedTimeItem[],
    targetCategory?: LimitedTimeCategory
): Promise<{ newItems: LimitedTimeItem[]; soldOutItems: LimitedTimeItem[] }> {
    if (items.length === 0 && !targetCategory) {
        return { newItems: [], soldOutItems: [] };
    }

    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    let existingRows: any[] = [];

    while (hasMore) {
        let query = supabase
            .from('limited_time_products')
            .select('*')
            .range(from, from + pageSize - 1);

        if (targetCategory) {
            query = query.eq('gender', targetCategory);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[LimitedTime] Failed to fetch existing rows:', error);
            break;
        }

        if (data && data.length > 0) {
            existingRows = existingRows.concat(data);
            from += pageSize;
            hasMore = data.length === pageSize;
        } else {
            hasMore = false;
        }
    }

    const oldMap = new Map(existingRows.map(item => [getCompareKey(item), item]));
    const newMap = new Map(items.map(item => [getCompareKey(item), item]));

    const newItems = items.filter(item => !oldMap.has(getCompareKey(item)));
    const existingItems = items.filter(item => oldMap.has(getCompareKey(item)));
    const soldOutItems = existingRows.filter(item => !newMap.has(getCompareKey(item)));

    if (soldOutItems.length > 0) {
        const idsToDelete = soldOutItems.map(item => item.id).filter(Boolean);
        for (let index = 0; index < idsToDelete.length; index += 100) {
            const batchIds = idsToDelete.slice(index, index + 100);
            const { error } = await supabase.from('limited_time_products').delete().in('id', batchIds);
            if (error) {
                console.error('[LimitedTime] Failed to delete sold-out items:', error);
            }
        }
    }

    if (existingItems.length > 0) {
        const updates = existingItems
            .map(item => {
                const oldItem = oldMap.get(getCompareKey(item));
                if (!oldItem?.id) return null;

                return {
                    id: oldItem.id,
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
                    sku_id: cleanString(item.sku_id),
                    main_pic: cleanString(item.main_pic)
                };
            })
            .filter(Boolean);

        const uniqueUpdates = Array.from(new Map(updates.map(item => [item!.id, item!])).values());
        for (let index = 0; index < uniqueUpdates.length; index += 100) {
            const batch = uniqueUpdates.slice(index, index + 100);
            const { error } = await supabase
                .from('limited_time_products')
                .upsert(batch, { onConflict: 'id' });

            if (error) {
                console.error('[LimitedTime] Failed to update existing items:', error);
            }
        }
    }

    const successfullySavedItems: LimitedTimeItem[] = [];
    if (newItems.length > 0) {
        for (let index = 0; index < newItems.length; index += 50) {
            const batch = newItems.slice(index, index + 50);
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
                sku_id: cleanString(item.sku_id),
                main_pic: cleanString(item.main_pic)
            }));

            const { error } = await supabase.from('limited_time_products').insert(dbBatch);
            if (error) {
                console.error('[LimitedTime] Failed to save new batch:', error);
            } else {
                successfullySavedItems.push(...batch);
            }
        }
    }

    return {
        newItems: successfullySavedItems,
        soldOutItems
    };
}

async function sendLimitedTimeNotifications(newItems: LimitedTimeItem[], targetCategory?: LimitedTimeCategory) {
    if (!targetCategory || newItems.length === 0) {
        return;
    }

    const { data: rawSubscriptions, error: subError } = await supabase
        .from('limited_time_push_subscriptions')
        .select('id, user_id, genders')
        .eq('is_enabled', true)
        .contains('genders', [targetCategory]);

    if (subError) {
        throw subError;
    }

    if (!rawSubscriptions || rawSubscriptions.length === 0) {
        return;
    }

    const userIds = Array.from(new Set(rawSubscriptions.map(sub => sub.user_id)));
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, wx_user_id')
        .in('id', userIds);

    if (userError) {
        throw userError;
    }

    const userMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
    }, {} as Record<string, any>);

    const subscriptions = rawSubscriptions.map(sub => ({
        ...sub,
        user: userMap[sub.user_id]
    }));

    const itemsByCode = newItems.reduce((acc, item) => {
        if (!acc[item.code]) {
            acc[item.code] = [];
        }
        acc[item.code].push(item);
        return acc;
    }, {} as Record<string, LimitedTimeItem[]>);

    for (const subscription of subscriptions) {
        const user = subscription.user;
        if (!user?.wx_user_id) {
            continue;
        }

        const totalCodes = Object.keys(itemsByCode).length;
        const title = `限时特优新增 ${totalCodes} 款商品`;
        let content = '';

        let index = 1;
        for (const code in itemsByCode) {
            const variants = itemsByCode[code];
            const firstItem = variants[0];
            const specs = variants.map(item => `${item.color} ${item.size}`).join('、');
            const priceInfo = firstItem.origin_price > firstItem.price ? ` (原价: ¥${firstItem.origin_price})` : '';

            content += `${index}. ${firstItem.name}\n   货号：${code}\n   品类：${firstItem.gender}\n   规格：${specs}\n   价格：¥${firstItem.price}${priceInfo}\n`;
            index += 1;
        }

        const baseUrl = process.env.WECHAT_BASE_URL;
        const notificationUrl = `${baseUrl}/notification`;

        const result = await sendWxNotification(
            user.wx_user_id,
            title,
            content.trim(),
            notificationUrl,
            process.env.WECHAT_TEMPLATE_ID_SUPER || process.env.WECHAT_TEMPLATE_ID
        );

        if (!result.success) {
            console.error(`[LimitedTime] Failed to send notification to ${user.username}:`, result.error);
        }
    }
}

export async function crawlLimitedTimeProducts(targetCategory?: string): Promise<{
    totalFound: number;
    newItems: LimitedTimeItem[];
    soldOutItems: LimitedTimeItem[];
}> {
    const category = isLimitedTimeCategory(targetCategory) ? targetCategory : undefined;
    const seedGroups = await fetchLimitedTimeSeedGroups();
    const seeds = category
        ? seedGroups[category]
        : LIMITED_TIME_CATEGORIES.flatMap(currentCategory => seedGroups[currentCategory]);

    console.log(`[LimitedTime] Starting crawl${category ? ` for ${category}` : ''}. Seed count: ${seeds.length}`);

    if (seeds.length === 0) {
        return { totalFound: 0, newItems: [], soldOutItems: [] };
    }

    const allResults: LimitedTimeItem[] = [];
    const concurrencyLimit = 20;
    let nextIndex = 0;

    const workers = new Array(Math.min(concurrencyLimit, seeds.length)).fill(null).map(async () => {
        while (nextIndex < seeds.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            const items = await processLimitedTimeSeed(seeds[currentIndex]);
            if (items.length > 0) {
                allResults.push(...items);
            }
        }
    });

    await Promise.all(workers);

    const { newItems, soldOutItems } = await saveLimitedTimeItems(allResults, category);
    await sendLimitedTimeNotifications(newItems, category);

    return {
        totalFound: allResults.length,
        newItems,
        soldOutItems
    };
}
