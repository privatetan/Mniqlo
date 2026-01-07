/**
 * WeChat Template Message Usage Examples
 * 
 * This file demonstrates how to use the wechatTemplateService
 * to send template messages to WeChat users.
 */

import { wechatTemplateService, WeChatTemplateData } from './wechat-template';

/**
 * Example 1: Send a simple notification
 */
export async function sendSimpleNotification(openId: string) {
    const templateData: WeChatTemplateData = {
        first: {
            value: '您好，您有新的消息',
            color: '#173177',
        },
        keyword1: {
            value: '系统通知',
        },
        keyword2: {
            value: new Date().toLocaleString('zh-CN'),
        },
        remark: {
            value: '点击查看详情',
            color: '#FF0000',
        },
    };

    try {
        const result = await wechatTemplateService.sendTemplateMessage(
            openId,
            templateData
        );
        console.log('Notification sent successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to send notification:', error);
        throw error;
    }
}

/**
 * Example 2: Send notification with URL link
 */
export async function sendNotificationWithLink(
    openId: string,
    title: string,
    content: string,
    url: string
) {
    const templateData: WeChatTemplateData = {
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

    try {
        const result = await wechatTemplateService.sendTemplateMessage(
            openId,
            templateData,
            { url }
        );
        console.log('Notification with link sent successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to send notification with link:', error);
        throw error;
    }
}

/**
 * Example 3: Send notification with miniprogram link
 */
export async function sendNotificationWithMiniProgram(
    openId: string,
    title: string,
    content: string,
    miniprogramAppId: string,
    pagePath: string
) {
    const templateData: WeChatTemplateData = {
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
            value: '点击进入小程序查看',
            color: '#FF0000',
        },
    };

    try {
        const result = await wechatTemplateService.sendTemplateMessage(
            openId,
            templateData,
            {
                miniprogram: {
                    appid: miniprogramAppId,
                    pagepath: pagePath,
                },
            }
        );
        console.log('Notification with miniprogram sent successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to send notification with miniprogram:', error);
        throw error;
    }
}

/**
 * Example 4: Send custom template message
 */
export async function sendCustomTemplateMessage(
    openId: string,
    customTemplateId: string,
    data: WeChatTemplateData
) {
    try {
        const result = await wechatTemplateService.sendCustomTemplate(
            openId,
            customTemplateId,
            data
        );
        console.log('Custom template message sent successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to send custom template message:', error);
        throw error;
    }
}

/**
 * Example 5: Send task notification (specific to this project)
 */
export async function sendTaskNotification(
    openId: string,
    taskName: string,
    status: string,
    time: string
) {
    const templateData: WeChatTemplateData = {
        first: {
            value: '任务状态更新',
            color: '#173177',
        },
        keyword1: {
            value: taskName,
        },
        keyword2: {
            value: status,
            color: status === '成功' ? '#00FF00' : '#FF0000',
        },
        keyword3: {
            value: time,
        },
        remark: {
            value: '感谢您的使用！',
        },
    };

    try {
        const result = await wechatTemplateService.sendTemplateMessage(
            openId,
            templateData,
            {
                url: `${process.env.WECHAT_BASE_URL || 'http://localhost:3000'}/tasks`,
            }
        );
        console.log('Task notification sent successfully:', result);
        return result;
    } catch (error) {
        console.error('Failed to send task notification:', error);
        throw error;
    }
}
