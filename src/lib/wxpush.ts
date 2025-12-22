import { fetchWithLogging, logError, generateRequestId } from './logger';

export const WX_PUSH_CONFIG = {
    url: process.env.WX_PUSH_URL || 'https://mniqlo-wxpush.pittlucy9.workers.dev/wxsend',
    template_id: process.env.WX_PUSH_TEMPLATE_ID || '',
    base_url: process.env.WX_PUSH_BASE_URL || '',
    token: process.env.WX_PUSH_TOKEN || ''
};


export async function sendWxNotification(userid: string, title: string, content: string) {
    const requestId = generateRequestId();
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
        const response = await fetchWithLogging(fullUrl);
        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        logError({ requestId, error, context: 'sendWxNotification' });
        return { success: false, error };
    }
}
