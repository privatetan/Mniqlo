import { wechatTemplateService } from './wechat-template';

/**
 * Send WeChat notification using template message
 * This is a simplified wrapper for backward compatibility
 */
export async function sendWxNotification(
    openId: string,
    title: string,
    content: string,
    url?: string
): Promise<{ success: boolean; msgid?: number; error?: string }> {
    try {
        const templateData = {
            first: {
                value: title,
                color: '#173177',
            },
            keyword1: {
                value: content,
            },
            keyword2: {
                value: new Date().toLocaleString('zh-CN'),
            },
            remark: {
                value: '点击查看详情',
                color: '#FF0000',
            },
        };

        const notificationUrl = url || `${wechatTemplateService['baseUrl'] || 'http://localhost:3000'}/notification`;

        const finalUrl = new URL(notificationUrl);
        finalUrl.searchParams.append('title', title);
        finalUrl.searchParams.append('message', content);
        finalUrl.searchParams.append('date', new Date().toLocaleString('zh-CN'));

        const result = await wechatTemplateService.sendTemplateMessage(
            openId,
            templateData,
            { url: finalUrl.toString() }
        );

        return {
            success: true,
            msgid: result.msgid,
        };
    } catch (error) {
        console.error('Failed to send WeChat notification:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
