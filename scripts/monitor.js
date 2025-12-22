const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Configuration for WeChat Push (mirrors src/lib/wxpush.ts)
const WX_PUSH_CONFIG = {
    url: 'https://mniqlo-wxpush.pittlucy9.workers.dev/wxsend',
    template_id: 'yuJhvEg27v9xabCLKM7XQBqJJm9snhn8ml2pekcucVk',
    base_url: 'http://43.129.237.149:3000',
    token: 'B5445E73C1C669E23B14DA2601FC7039'
};

async function sendWxNotification(userid, title, content) {
    const params = new URLSearchParams({
        userid,
        template_id: WX_PUSH_CONFIG.template_id,
        base_url: WX_PUSH_CONFIG.base_url,
        token: WX_PUSH_CONFIG.token,
        title,
        content
    });

    try {
        const response = await fetch(`${WX_PUSH_CONFIG.url}?${params.toString()}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to send WxPush notification:', error);
        return { success: false, error };
    }
}

async function getProductStock(productId) {
    const STOCK_URL = 'https://d.uniqlo.cn/p/stock/stock/query/zh_CN';
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
        return await res.json();
    } catch (error) {
        console.error('Error fetching stock:', error);
        return null;
    }
}

async function getProductDetails(productId) {
    const url = `https://www.uniqlo.cn/data/products/spu/zh_CN/${productId}.json`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.rows || [];
    } catch (error) {
        return [];
    }
}

async function run() {
    console.log(`[${new Date().toLocaleString()}] Starting monitor check...`);

    const tasks = await prisma.monitorTask.findMany({
        where: { isActive: true },
        include: { user: true }
    });

    console.log(`Found ${tasks.length} active tasks.`);

    for (const task of tasks) {
        // Time window check
        if (task.startTime && task.endTime) {
            const now = new Date();
            const currentHm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            let isInWindow = false;
            if (task.startTime <= task.endTime) {
                isInWindow = currentHm >= task.startTime && currentHm <= task.endTime;
            } else {
                isInWindow = currentHm >= task.startTime || currentHm <= task.endTime;
            }
            if (!isInWindow) {
                console.log(`Skipping Task ${task.id}: Outside time window (${task.startTime}-${task.endTime})`);
                continue;
            }
        }

        console.log(`Checking Task ${task.id} for Product ${task.productId} (${task.style || 'any'}/${task.size || 'any'})...`);

        const stockData = await getProductStock(task.productId);
        if (!stockData || !stockData.resp || !stockData.resp[0]) continue;

        const stockMap = stockData.resp[0];
        const skuStocks = stockMap.skuStocks || {};
        const expressSkuStocks = stockMap.expressSkuStocks || {};

        const details = await getProductDetails(task.productId);
        let hasStock = false;
        let matchedItem = null;

        for (const row of details) {
            if (task.style && row.style !== task.style) continue;
            if (task.size && row.size !== task.size) continue;

            const pid = row.productId;
            const stock = (parseInt(skuStocks[pid], 10) || 0) + (parseInt(expressSkuStocks[pid], 10) || 0);

            if (stock > 0) {
                hasStock = true;
                matchedItem = row;
                break;
            }
        }

        if (hasStock && task.user.wxUserId) {
            // Rate limiting check
            const freq = task.user.notifyFrequency || 60;
            const lastNotification = await prisma.notificationLog.findFirst({
                where: {
                    userId: task.userId,
                    productId: task.productId,
                    style: task.style || null,
                    size: task.size || null,
                    timestamp: {
                        gte: new Date(Date.now() - freq * 60 * 1000)
                    }
                },
                orderBy: { timestamp: 'desc' }
            });

            if (lastNotification) {
                console.log(`Skipping notification for Task ${task.id}: Rate limit (${freq} mins)`);
                continue;
            }

            console.log(`Stock found! Notifying user ${task.user.username}...`);
            const title = `库存提醒: ${matchedItem.name}`;
            const content = `您监控的商品 [${task.productId}] ${matchedItem.name} (${matchedItem.style}/${matchedItem.size}) 现在有货了！`;

            const result = await sendWxNotification(task.user.wxUserId, title, content);

            if (result.success) {
                // Log the success in NotificationLog for rate limiting
                await prisma.notificationLog.create({
                    data: {
                        userId: task.userId,
                        productId: task.productId,
                        style: task.style || null,
                        size: task.size || null,
                    }
                });

                // Log in TaskLog for task history
                await prisma.taskLog.create({
                    data: {
                        taskId: task.id,
                        status: 'NOTIFIED',
                        message: `Stock detected and user notified: ${matchedItem.style}/${matchedItem.size}`
                    }
                });
            }
        } else {
            // Log the failure/check in TaskLog
            await prisma.taskLog.create({
                data: {
                    taskId: task.id,
                    status: hasStock ? 'NO_PUID' : 'OUT_OF_STOCK',
                    message: hasStock ? 'Stock available but no WxUserId set' : 'Still out of stock'
                }
            });
        }
    }

    console.log('Monitor check completed.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
