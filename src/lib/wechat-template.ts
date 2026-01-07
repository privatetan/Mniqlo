/**
 * WeChat Template Message Configuration
 */
interface WeChatTemplateData {
    [key: string]: {
        value: string;
        color?: string;
    };
}

interface WeChatTemplateSendData {
    touser: string;
    template_id: string;
    data: WeChatTemplateData;
    url?: string;
    miniprogram?: {
        appid: string;
        pagepath: string;
    };
}

interface WeChatTokenResponse {
    access_token: string;
    expires_in: number;
}

interface WeChatSendResponse {
    errcode: number;
    errmsg: string;
    msgid?: number;
}

/**
 * WeChat Template Message Service
 * Handles sending template messages via WeChat Official Account API
 */
class WeChatTemplateService {
    private appid: string;
    private appsecret: string;
    private templateId: string;
    private baseUrl: string;
    private tokenCache: {
        token: string;
        expiresAt: number;
    } | null = null;

    constructor() {
        this.appid = process.env.WECHAT_APPID || '';
        this.appsecret = process.env.WECHAT_APPSECRET || '';
        this.templateId = process.env.WECHAT_TEMPLATE_ID || '';
        this.baseUrl = process.env.WECHAT_BASE_URL || '';

        if (!this.appid || !this.appsecret || !this.templateId) {
            console.warn('WeChat configuration is incomplete. Please check your .env file.');
        }
    }

    /**
     * Get access token from WeChat API
     * Implements token caching to avoid frequent API calls
     */
    async getAccessToken(): Promise<string> {
        // Check if we have a valid cached token
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.token;
        }

        try {
            const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
            url.searchParams.append('grant_type', 'client_credential');
            url.searchParams.append('appid', this.appid);
            url.searchParams.append('secret', this.appsecret);

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: WeChatTokenResponse = await response.json();

            if (!data.access_token) {
                throw new Error('No access token in response');
            }

            const { access_token, expires_in } = data;

            // Cache the token (expires_in is in seconds, subtract 5 minutes for safety)
            this.tokenCache = {
                token: access_token,
                expiresAt: Date.now() + (expires_in - 300) * 1000,
            };

            return access_token;
        } catch (error) {
            console.error('Failed to get WeChat access token:', error);
            throw new Error('Failed to get WeChat access token');
        }
    }

    /**
     * Send template message to a specific user
     * @param touser - WeChat OpenID of the recipient
     * @param data - Template data object
     * @param options - Optional URL or miniprogram configuration
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
        }
    ): Promise<WeChatSendResponse> {
        try {
            const token = await this.getAccessToken();

            const sendData: WeChatTemplateSendData = {
                touser,
                template_id: this.templateId,
                data,
                url: options?.url || this.baseUrl,
                ...options,
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: WeChatSendResponse = await response.json();

            if (result.errcode !== 0) {
                console.error('WeChat template message send failed:', result);
                throw new Error(`WeChat API Error: ${result.errmsg}`);
            }

            console.log('WeChat template message sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Failed to send WeChat template message:', error);
            throw error;
        }
    }

    /**
     * Send a notification with custom template ID
     * @param touser - WeChat OpenID of the recipient
     * @param templateId - Custom template ID (overrides default)
     * @param data - Template data object
     * @param options - Optional URL or miniprogram configuration
     */
    async sendCustomTemplate(
        touser: string,
        templateId: string,
        data: WeChatTemplateData,
        options?: {
            url?: string;
            miniprogram?: {
                appid: string;
                pagepath: string;
            };
        }
    ): Promise<WeChatSendResponse> {
        try {
            const token = await this.getAccessToken();

            const sendData: WeChatTemplateSendData = {
                touser,
                template_id: templateId,
                data,
                url: options?.url || this.baseUrl,
                ...options,
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: WeChatSendResponse = await response.json();

            if (result.errcode !== 0) {
                console.error('WeChat template message send failed:', result);
                throw new Error(`WeChat API Error: ${result.errmsg}`);
            }

            console.log('WeChat template message sent successfully:', result);
            return result;
        } catch (error) {
            console.error('Failed to send WeChat template message:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const wechatTemplateService = new WeChatTemplateService();

// Export types for use in other modules
export type { WeChatTemplateData, WeChatTemplateSendData, WeChatSendResponse };
