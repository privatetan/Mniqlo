/**
 * 统一日志工具模块
 * 用于记录 HTTP 请求、响应和错误信息
 */

// 生成唯一的请求 ID
let requestCounter = 0;
export function generateRequestId(): string {
    return `req_${Date.now()}_${++requestCounter}`;
}

// 格式化时间戳
function formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

// 颜色代码 (ANSI)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // 前景色
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

// 截断长字符串
function truncate(str: string, maxLength: number = 500): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

// 安全地序列化对象
function safeStringify(obj: any, maxLength: number = 1000): string {
    try {
        const str = JSON.stringify(obj, null, 2);
        return truncate(str, maxLength);
    } catch (error) {
        return '[无法序列化]';
    }
}

// 隐藏敏感信息
function maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;

    const masked = { ...data };
    const sensitiveKeys = ['token', 'password', 'secret', 'apikey', 'authorization'];

    for (const key in masked) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
            masked[key] = '***MASKED***';
        }
    }

    return masked;
}

export interface RequestLogOptions {
    requestId?: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
}

export interface ResponseLogOptions {
    requestId?: string;
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
    duration?: number;
}

export interface ErrorLogOptions {
    requestId?: string;
    error: any;
    context?: string;
}

/**
 * 记录 HTTP 请求
 */
export function logRequest(options: RequestLogOptions): void {
    const { requestId = 'N/A', method, url, headers, body } = options;

    console.log(
        `${colors.cyan}[${formatTimestamp()}]${colors.reset} ` +
        `${colors.bright}${colors.blue}[REQUEST]${colors.reset} ` +
        `${colors.gray}[${requestId}]${colors.reset} ` +
        `${colors.bright}${method}${colors.reset} ${url}`
    );

    if (headers) {
        const maskedHeaders = maskSensitiveData(headers);
        console.log(`  ${colors.dim}Headers:${colors.reset}`, safeStringify(maskedHeaders, 300));
    }

    if (body) {
        const maskedBody = maskSensitiveData(body);
        console.log(`  ${colors.dim}Body:${colors.reset}`, safeStringify(maskedBody, 500));
    }
}

/**
 * 记录 HTTP 响应
 */
export function logResponse(options: ResponseLogOptions): void {
    const { requestId = 'N/A', status, statusText = '', headers, body, duration } = options;

    // 根据状态码选择颜色
    let statusColor = colors.green;
    if (status >= 400 && status < 500) statusColor = colors.yellow;
    if (status >= 500) statusColor = colors.red;

    const durationText = duration ? ` ${colors.gray}(${duration}ms)${colors.reset}` : '';

    console.log(
        `${colors.cyan}[${formatTimestamp()}]${colors.reset} ` +
        `${colors.bright}${colors.green}[RESPONSE]${colors.reset} ` +
        `${colors.gray}[${requestId}]${colors.reset} ` +
        `${statusColor}${status} ${statusText}${colors.reset}${durationText}`
    );

    if (headers) {
        console.log(`  ${colors.dim}Headers:${colors.reset}`, safeStringify(headers, 300));
    }

    if (body) {
        // 对于成功响应,显示数据摘要
        if (status >= 200 && status < 300) {
            if (typeof body === 'object') {
                const summary = Array.isArray(body)
                    ? `Array(${body.length})`
                    : `Object(${Object.keys(body).length} keys)`;
                console.log(`  ${colors.dim}Data:${colors.reset} ${summary}`);
                console.log(`  ${colors.dim}Preview:${colors.reset}`, safeStringify(body, 500));
            } else {
                console.log(`  ${colors.dim}Data:${colors.reset}`, truncate(String(body), 500));
            }
        } else {
            // 对于错误响应,显示完整信息
            console.log(`  ${colors.dim}Error Data:${colors.reset}`, safeStringify(body, 1000));
        }
    }
}

/**
 * 记录错误
 */
export function logError(options: ErrorLogOptions): void {
    const { requestId = 'N/A', error, context } = options;

    console.error(
        `${colors.cyan}[${formatTimestamp()}]${colors.reset} ` +
        `${colors.bright}${colors.red}[ERROR]${colors.reset} ` +
        `${colors.gray}[${requestId}]${colors.reset} ` +
        `${context ? colors.yellow + context + colors.reset + ' - ' : ''}` +
        `${error?.message || error}`
    );

    if (error?.stack) {
        console.error(`  ${colors.dim}Stack:${colors.reset}`, error.stack);
    }

    if (error && typeof error === 'object') {
        console.error(`  ${colors.dim}Details:${colors.reset}`, safeStringify(error, 1000));
    }
}

/**
 * 创建带有日志的 fetch 包装器
 */
export async function fetchWithLogging(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const method = options.method || 'GET';

    // 记录请求
    logRequest({
        requestId,
        method,
        url,
        headers: options.headers as Record<string, string>,
        body: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
    });

    try {
        const response = await fetch(url, options);
        const duration = Date.now() - startTime;

        // 克隆响应以便读取 body
        const clonedResponse = response.clone();
        let responseBody;

        try {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                responseBody = await clonedResponse.json();
            } else {
                responseBody = await clonedResponse.text();
            }
        } catch {
            responseBody = '[无法解析响应体]';
        }

        // 记录响应
        logResponse({
            requestId,
            status: response.status,
            statusText: response.statusText,
            body: responseBody,
            duration,
        });

        return response;
    } catch (error) {
        const duration = Date.now() - startTime;

        // 记录错误
        logError({
            requestId,
            error,
            context: `${method} ${url} (${duration}ms)`,
        });

        throw error;
    }
}
