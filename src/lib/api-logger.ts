/**
 * API 路由日志中间件
 * 用于自动记录所有 API 请求和响应
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from './logger';

// 颜色代码 (ANSI)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    dim: '\x1b[2m',
};

// 格式化时间戳
function formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

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

/**
 * API 日志中间件包装器
 * 
 * 使用方法:
 * ```typescript
 * export const GET = withApiLogging(async (request: NextRequest) => {
 *   // 你的处理逻辑
 *   return NextResponse.json({ data: 'example' });
 * });
 * ```
 */
export function withApiLogging(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
        const requestId = generateRequestId();
        const startTime = Date.now();
        const { pathname, searchParams } = new URL(request.url);
        const method = request.method;

        // 记录请求
        console.log(
            `${colors.cyan}[${formatTimestamp()}]${colors.reset} ` +
            `${colors.bright}${colors.blue}[API REQUEST]${colors.reset} ` +
            `${colors.gray}[${requestId}]${colors.reset} ` +
            `${colors.bright}${method}${colors.reset} ${pathname}`
        );

        // 记录查询参数
        if (searchParams.toString()) {
            const params: Record<string, string> = {};
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
            console.log(`  ${colors.dim}Query:${colors.reset}`, safeStringify(params, 300));
        }

        // 记录请求体 (如果有)
        try {
            const contentType = request.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const clonedRequest = request.clone();
                const body = await clonedRequest.json();
                console.log(`  ${colors.dim}Body:${colors.reset}`, safeStringify(body, 500));
            }
        } catch {
            // 忽略解析错误
        }

        let response: NextResponse;
        let error: any = null;

        try {
            // 执行实际的处理函数
            response = await handler(request, context);
        } catch (err) {
            error = err;
            // 创建错误响应
            response = NextResponse.json(
                { error: '服务器内部错误' },
                { status: 500 }
            );
        }

        const duration = Date.now() - startTime;
        const status = response.status;

        // 根据状态码选择颜色
        let statusColor = colors.green;
        if (status >= 400 && status < 500) statusColor = colors.yellow;
        if (status >= 500) statusColor = colors.red;

        // 记录响应
        console.log(
            `${colors.cyan}[${formatTimestamp()}]${colors.reset} ` +
            `${colors.bright}${colors.green}[API RESPONSE]${colors.reset} ` +
            `${colors.gray}[${requestId}]${colors.reset} ` +
            `${statusColor}${status}${colors.reset} ` +
            `${colors.gray}(${duration}ms)${colors.reset}`
        );

        // 记录响应体预览
        try {
            const clonedResponse = response.clone();
            const contentType = response.headers.get('content-type');

            if (contentType?.includes('application/json')) {
                const body = await clonedResponse.json();
                if (status >= 200 && status < 300) {
                    const summary = Array.isArray(body)
                        ? `Array(${body.length})`
                        : typeof body === 'object'
                            ? `Object(${Object.keys(body).length} keys)`
                            : String(body);
                    console.log(`  ${colors.dim}Response:${colors.reset} ${summary}`);
                } else {
                    console.log(`  ${colors.dim}Error:${colors.reset}`, safeStringify(body, 500));
                }
            }
        } catch {
            // 忽略解析错误
        }

        // 如果有错误,记录错误详情
        if (error) {
            console.error(
                `${colors.cyan}[${formatTimestamp()}]${colors.reset} ` +
                `${colors.bright}${colors.red}[API ERROR]${colors.reset} ` +
                `${colors.gray}[${requestId}]${colors.reset} ` +
                `${error?.message || error}`
            );
            if (error?.stack) {
                console.error(`  ${colors.dim}Stack:${colors.reset}`, error.stack);
            }
        }

        return response;
    };
}
