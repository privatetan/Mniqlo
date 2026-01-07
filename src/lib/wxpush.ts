export const WX_PUSH_CONFIG = {
    url: process.env.WX_PUSH_URL || 'https://mniqlo-wxpush.pittlucy9.workers.dev/wxsend',
    template_id: process.env.WX_PUSH_TEMPLATE_ID || '',
    base_url: process.env.WX_PUSH_BASE_URL || '',
    token: process.env.WX_PUSH_TOKEN || ''
};


export async function sendWxNotification(userid: string, title: string, content: string) {
    const params = new URLSearchParams({
        userid: userid,
        template_id: WX_PUSH_CONFIG.template_id,
        base_url: WX_PUSH_CONFIG.base_url,
        token: WX_PUSH_CONFIG.token,
        title,
        content
    });

    const fullUrl = `${WX_PUSH_CONFIG.url}?${params.toString()}`;

    try {
        const response = await fetch(fullUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*'
            }
        });
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Check if text indicates success specifically for this worker
            if (text.includes('Successful') || response.ok) {
                data = { message: text };
            } else {
                throw new Error(`Invalid response: ${text}`);
            }
        }

        return { success: response.ok, data };
    } catch (error: any) {
        console.error('WxPush Error:', error);
        return { success: false, message: error.message || String(error) };
    }
}
