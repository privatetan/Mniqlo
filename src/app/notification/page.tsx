'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface NotificationDetail {
    id: string;
    title: string;
    content: string;
    timestamp: string;
    templateData?: Record<string, string>; // 存储原始模板数据
    productId?: string;
    style?: string;
    size?: string;
    username?: string;
}

function NotificationContent() {
    const searchParams = useSearchParams();
    const [notification, setNotification] = useState<NotificationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                // 收集所有 URL 参数中可能存在的模板数据
                const dataMap: Record<string, string> = {};
                let hasData = false;

                searchParams.forEach((value, key) => {
                    console.log(`URL Param Received - ${key}:`, value);
                    if (key === 'first' || key.startsWith('keyword') || key === 'remark') {
                        dataMap[key] = value;
                        hasData = true;
                    }
                });

                console.log('Parsed Template Data Map:', dataMap);

                // Check for explicitly named parameters first (the new standard)
                const titleParam = searchParams.get('title');
                const messageParam = searchParams.get('message');
                const dateParam = searchParams.get('date');

                if (titleParam || messageParam) {
                    setNotification({
                        id: 'url-params-explicit',
                        title: titleParam || '消息通知',
                        content: messageParam || '',
                        timestamp: dateParam || new Date().toLocaleString('zh-CN'),
                        // Merge with any other template data found
                        templateData: hasData ? dataMap : undefined
                    });
                    setLoading(false);
                    return;
                }

                // URL Params Legacy Support (template data encoding)
                if (hasData) {
                    setNotification({
                        id: 'url-params',
                        title: dataMap['first'] || '消息通知',
                        content: dataMap['keyword1'] || '',
                        timestamp: dataMap['keyword2'] || new Date().toLocaleString('zh-CN'),
                        productId: dataMap['keyword3'] || undefined,
                        templateData: dataMap
                    });
                    setLoading(false);
                    return;
                }

                // 否则尝试从 API 获取 (如果带有 id 参数)
                const notificationId = searchParams.get('id');
                if (notificationId) {
                    const response = await fetch(`/api/notifications/${notificationId}`);
                    if (!response.ok) {
                        throw new Error('获取通知详情失败');
                    }
                    const data = await response.json();
                    setNotification(data);
                } else {
                    // 如果既没有 URL 参数也没有 ID,显示通用消息
                    setNotification({
                        id: 'general',
                        title: '消息通知',
                        content: '您收到了一条新的通知消息',
                        timestamp: new Date().toLocaleString('zh-CN'),
                    });
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '未知错误');
            } finally {
                setLoading(false);
            }
        };

        fetchNotification();
    }, [searchParams]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="mt-4 text-gray-600 text-lg font-medium">消息加载中...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">加载失败</h2>
                        <p className="text-gray-600">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!notification) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
                    <div className="flex items-center">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mr-5 shadow-inner">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">通知详情</h1>
                            <p className="text-indigo-100/80 text-sm mt-1">{notification.timestamp}</p>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-8">
                    {/* Main Display Area */}
                    <div className="space-y-6">
                        {/* Title / First */}
                        <div className="border-b border-gray-100 pb-6">
                            <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
                                {notification.title}
                            </h2>
                        </div>

                        {/* Template Data Fields */}
                        {notification.templateData ? (
                            <div className="space-y-4">
                                {Object.entries(notification.templateData)
                                    .filter(([key]) => key !== 'first' && key !== 'remark')
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([key, value]) => (
                                        <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 pb-4 border-b border-gray-50 last:border-0">
                                            <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest w-24 flex-shrink-0">
                                                {key === 'keyword1' ? '提醒内容' :
                                                    key === 'keyword2' ? '时间戳' :
                                                        key === 'keyword3' ? '商品信息' : key}
                                            </span>
                                            <span className="text-lg text-gray-800 font-medium break-words">
                                                {value}
                                            </span>
                                        </div>
                                    ))}

                                {notification.templateData['remark'] && (
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mt-6">
                                        <p className="text-gray-500 text-sm italic">
                                            {notification.templateData['remark']}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Fallback content if no templateData
                            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                                <p className="text-gray-800 text-xl leading-relaxed whitespace-pre-wrap font-medium">
                                    {notification.content}
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Product Details Section (if exists) */}
                    {(notification.productId || notification.style || notification.size) && (
                        <div className="border-t border-gray-100 pt-8 mt-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                商品监控详情
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {notification.productId && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">商品编号</span>
                                        <span className="text-lg font-bold text-gray-800">{notification.productId}</span>
                                    </div>
                                )}
                                {notification.style && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">款式</span>
                                        <span className="text-lg font-bold text-gray-800">{notification.style}</span>
                                    </div>
                                )}
                                {notification.size && (
                                    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition-colors">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">尺寸</span>
                                        <span className="text-lg font-bold text-gray-800">{notification.size}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="mt-10 flex flex-col sm:flex-row gap-4">
                        <a
                            href="/favorites"
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 px-8 rounded-2xl font-bold shadow-lg shadow-indigo-200 transform active:scale-95 transition-all text-center"
                        >
                            查看收藏清单
                        </a>
                        <a
                            href="/"
                            className="flex-1 bg-gray-50 text-gray-500 py-4 px-8 rounded-2xl font-bold hover:bg-gray-100 transition-all text-center border border-gray-100"
                        >
                            返回主页
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50/80 px-8 py-5 border-t border-gray-100 text-center">
                    <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                        Mniqlo Notification Service · 您贴心的库存助手
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function NotificationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <NotificationContent />
        </Suspense>
    );
}
