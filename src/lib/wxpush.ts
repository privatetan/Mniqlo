import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * WeChat Template Message Configuration
 */
export interface WeChatTemplateData {
    [key: string]: {
        value: string;
        color?: string;
    };
}

export interface WeChatTemplateSendData {
    touser: string;
    template_id: string;
    data: WeChatTemplateData;
    url?: string;
    miniprogram?: {
        appid: string;
        pagepath: string;
    };
}

export interface WeChatTokenResponse {
    access_token: string;
    expires_in: number;
}

export interface WeChatSendResponse {
    errcode: number;
    errmsg: string;
    msgid?: number;
}

/**
 * WeChat Notification Service
 * Handles token management and template message sending
 */
class WeChatPushService {
    private readonly appid: string;
    private readonly appsecret: string;
    private readonly templateId: string;
    private readonly baseUrl: string;
    private tokenCache: {
        token: string;
        expiresAt: number;
    } | null = null;
    private proxyAgent: HttpsProxyAgent<string> | null = null;

    constructor() {
        this.appid = process.env.WECHAT_APPID || '';
        this.appsecret = process.env.WECHAT_APPSECRET || '';
        this.templateId = process.env.WECHAT_TEMPLATE_ID || '';
        this.baseUrl = process.env.WECHAT_BASE_URL || '';

        const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        if (proxyUrl) {
            console.log(`[WeChat] Using Proxy: ${proxyUrl}`);
            this.proxyAgent = new HttpsProxyAgent(proxyUrl);
        }

        if (!this.appid || !this.appsecret || !this.templateId) {
            console.warn('[WeChat] Configuration incomplete. Check .env (APPID, APPSECRET, TEMPLATE_ID).');
        }
    }

    /**
     * Get access token with caching
     */
    async getAccessToken(forceRefresh = false): Promise<string> {
        if (!forceRefresh && this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.token;
        }

        try {
            const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
            url.searchParams.append('grant_type', 'client_credential');
            url.searchParams.append('appid', this.appid);
            url.searchParams.append('secret', this.appsecret);

            const options: RequestInit = { method: 'GET' };
            if (this.proxyAgent) {
                // @ts-ignore - node-fetch or similar might use agent
                options.agent = this.proxyAgent;
            }

            const response = await fetch(url.toString(), options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data: WeChatTokenResponse = await response.json();
            if (!data.access_token) throw new Error('No access token in response');

            this.tokenCache = {
                token: data.access_token,
                expiresAt: Date.now() + (data.expires_in - 300) * 1000,
            };

            return data.access_token;
        } catch (error) {
            console.error('[WeChat] Failed to get access token:', error);
            throw error;
        }
    }

    /**
     * Send template message
     */
    async sendTemplateMessage(
        touser: string,
        data: WeChatTemplateData,
        options?: {
            url?: string;
            miniprogram?: {
                appid: string;
                pagepath: string;
            };
        },
        retryCount = 0
    ): Promise<WeChatSendResponse> {
        try {
            // Force refresh if this is a retry
            const token = await this.getAccessToken(retryCount > 0);

            // Encode template data into URL for the notification detail page if applicable
            let notificationUrl = options?.url || this.baseUrl;
            if (notificationUrl && !options?.miniprogram) {
                const urlObj = new URL(notificationUrl);
                Object.keys(data).forEach(key => {
                    if (data[key]?.value) {
                        urlObj.searchParams.set(key, data[key].value);
                    }
                });
                notificationUrl = urlObj.toString();
            }

            const sendData: WeChatTemplateSendData = {
                touser,
                template_id: this.templateId,
                data,
                url: notificationUrl,
                ...options,
            };

            const url = new URL('https://api.weixin.qq.com/cgi-bin/message/template/send');
            url.searchParams.append('access_token', token);

            const fetchOptions: RequestInit = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sendData),
            };
            if (this.proxyAgent) {
                // @ts-ignore
                fetchOptions.agent = this.proxyAgent;
            }

            const response = await fetch(url.toString(), fetchOptions);
            const result: WeChatSendResponse = await response.json();

            if (result.errcode !== 0) {
                // Check for invalid token errors (40001, 40014, 42001)
                if ((result.errcode === 40001 || result.errcode === 40014 || result.errcode === 42001) && retryCount < 1) {
                    console.log(`[WeChat] Token invalid (errcode: ${result.errcode}), retrying with fresh token...`);
                    this.tokenCache = null; // Clear cache
                    return this.sendTemplateMessage(touser, data, options, retryCount + 1);
                }

                console.error('[WeChat] Send failed:', result);
                throw new Error(`WeChat API Error: ${result.errmsg}`);
            }

            return result;
        } catch (error) {
            console.error('[WeChat] Send error:', error);
            throw error;
        }
    }
}

// Singleton instances and backward compatibility
export const wxPushService = new WeChatPushService();
export const wechatTemplateService = wxPushService; // Alias for backward compatibility

/**
 * Simplified wrapper for backward compatibility
 */
export async function sendWxNotification(
    openId: string,
    title: string,
    content: string,
    url?: string
): Promise<{ success: boolean; msgid?: number; error?: string }> {
    try {
        const templateData: WeChatTemplateData = {
            first: { value: title, color: '#173177' },
            keyword1: { value: content },
            keyword2: { value: new Date().toLocaleString('zh-CN') },
            remark: { value: '点击查看详情', color: '#FF0000' },
        };

        // Add explicit title and content parameters to the URL for reliable access
        let notificationUrl = url;
        if (notificationUrl) {
            const urlObj = new URL(notificationUrl);
            urlObj.searchParams.set('title', title);
            urlObj.searchParams.set('content', content);
            notificationUrl = urlObj.toString();
        }

        const result = await wxPushService.sendTemplateMessage(openId, templateData, { url: notificationUrl });

        return {
            success: true,
            msgid: result.msgid,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
