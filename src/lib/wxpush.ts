export const WX_PUSH_CONFIG = {
    url: 'https://mniqlo-wxpush.pittlucy9.workers.dev/wxsend',
    template_id: 'yuJhvEg27v9xabCLKM7XQBqJJm9snhn8ml2pekcucVk',
    base_url: 'http://43.129.237.149:3000',
    token: 'B5445E73C1C669E23B14DA2601FC7039'
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
        const response = await fetch(fullUrl);
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('Failed to send WxPush notification:', error);
        return { success: false, error };
    }
}
