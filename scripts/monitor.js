const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// WeChat Template Message Configuration
const WECHAT_CONFIG = {
    appid: process.env.WECHAT_APPID,
    appsecret: process.env.WECHAT_APPSECRET,
    template_id: process.env.WECHAT_TEMPLATE_ID,
    base_url: process.env.WECHAT_BASE_URL,
};

// Token cache
let tokenCache = null;

/**
 * Get WeChat access token with caching
 */
async function getAccessToken() {
    // Check if we have a valid cached token
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
        return tokenCache.token;
    }

    try {
        const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
        url.searchParams.append('grant_type', 'client_credential');
        url.searchParams.append('appid', WECHAT_CONFIG.appid);
        url.searchParams.append('secret', WECHAT_CONFIG.appsecret);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!data.access_token) {
            throw new Error('No access token in response');
        }

        // Cache the token (expires_in is in seconds, subtract 5 minutes for safety)
        tokenCache = {
            token: data.access_token,
            expiresAt: Date.now() + (data.expires_in - 300) * 1000,
        };

        return data.access_token;
    } catch (error) {
        console.error('Failed to get WeChat access token:', error);
        throw error;
    }
}

/**
 * Send WeChat template message
 */
async function sendWxNotification(openId, title, content, productId) {
    try {
        const token = await getAccessToken();

        // 构建带参数的跳转链接, 方便详情页展示
        const notificationUrl = new URL(`${WECHAT_CONFIG.base_url}/notification`);
        notificationUrl.searchParams.set('first', title);
        notificationUrl.searchParams.set('keyword1', content);
        notificationUrl.searchParams.set('keyword2', new Date().toLocaleString('zh-CN'));

        const sendData = {
            touser: openId,
            template_id: WECHAT_CONFIG.template_id,
            data: {
                first: {
                    value: title,
                    color: '#173177'
                },
                keyword1: {
                    value: content
                },
                keyword2: {
                    value: new Date().toLocaleString('zh-CN')
                },
                remark: {
                    value: '点击查看详情',
                    color: '#FF0000'
                }
            },
            url: notificationUrl.toString()
        };

        const url = new URL('https://api.weixin.qq.com/cgi-bin/message/template/send');
        url.searchParams.append('access_token', token);

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sendData),
        });

        const result = await response.json();

        if (result.errcode !== 0) {
            console.error('WeChat template message send failed:', result);
            return { success: false, error: result.errmsg };
        }

        console.log('WeChat template message sent successfully:', result);
        return { success: true, msgid: result.msgid };
    } catch (error) {
        console.error('Failed to send WeChat notification:', error);
        return { success: false, error: error.message };
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

    // Fetch active tasks from Supabase
    const { data: tasks, error } = await supabase
        .from('monitor_tasks')
        .select(`
            *,
            users (
                username,
                wx_user_id,
                notify_frequency
            )
        `)
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    console.log(`Found ${tasks?.length || 0} active tasks.`);

    for (const task of tasks || []) {
        // Time window check
        if (task.start_time && task.end_time) {
            const now = new Date();
            const currentHm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            let isInWindow = false;
            if (task.start_time <= task.end_time) {
                isInWindow = currentHm >= task.start_time && currentHm <= task.end_time;
            } else {
                isInWindow = currentHm >= task.start_time || currentHm <= task.end_time;
            }
            if (!isInWindow) {
                console.log(`Skipping Task ${task.id}: Outside time window (${task.start_time}-${task.end_time})`);
                continue;
            }
        }

        console.log(`Checking Task ${task.id} for Product ${task.product_id} (${task.style || 'any'}/${task.size || 'any'})...`);

        const stockData = await getProductStock(task.product_id);
        if (!stockData || !stockData.resp || !stockData.resp[0]) continue;

        const stockMap = stockData.resp[0];
        const skuStocks = stockMap.skuStocks || {};
        const expressSkuStocks = stockMap.expressSkuStocks || {};

        const details = await getProductDetails(task.product_id);
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

        if (hasStock && task.users?.wx_user_id) {
            // Rate limiting check
            const freq = task.users.notify_frequency || 60;
            const { data: lastNotification } = await supabase
                .from('notification_logs')
                .select('*')
                .eq('user_id', task.user_id)
                .eq('product_id', task.product_id)
                .eq('style', task.style || null)
                .eq('size', task.size || null)
                .gte('timestamp', new Date(Date.now() - freq * 60 * 1000).toISOString())
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (lastNotification) {
                console.log(`Skipping notification for Task ${task.id}: Rate limit (${freq} mins)`);
                continue;
            }

            console.log(`Stock found! Notifying user ${task.users.username}...`);
            const title = `库存提醒: ${matchedItem.name}`;
            const content = `您监控的商品 [${task.product_id}] ${matchedItem.name} (${matchedItem.style}/${matchedItem.size}) 现在有货了！`;

            // Save notification to database first (for history)
            const { error: insertError } = await supabase
                .from('notification_logs')
                .insert({
                    user_id: task.user_id,
                    title: title,
                    content: content,
                    product_id: task.product_id,
                    style: task.style || null,
                    size: task.size || null,
                });

            if (insertError) {
                console.error('Failed to save notification:', insertError);
            }

            // Use baseUrl directly, message content will be encoded in URL params
            const notificationUrl = `${WECHAT_CONFIG.base_url}/notification`;

            // Send WeChat notification, content will be auto-encoded in URL
            const result = await sendWxNotification(task.users.wx_user_id, title, content, notificationUrl);

            if (result.success) {
                // Log in task_logs for task history
                await supabase.from('task_logs').insert({
                    task_id: task.id,
                    status: 'NOTIFIED',
                    message: `Stock detected and user notified: ${matchedItem.style}/${matchedItem.size}`
                });
            }
        } else {
            // Log the failure/check in task_logs
            await supabase.from('task_logs').insert({
                task_id: task.id,
                status: hasStock ? 'NO_PUID' : 'OUT_OF_STOCK',
                message: hasStock ? 'Stock available but no wx_user_id set' : 'Still out of stock'
            });
        }
    }

    console.log('Monitor check completed.');
}

run().catch(console.error);
