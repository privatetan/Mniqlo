'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface NotificationDetail {
    id: string;
    title: string;
    content: string;
    timestamp: string;
    productId?: string;
    style?: string;
    size?: string;
    username?: string;
}

export default function NotificationPage() {
    const searchParams = useSearchParams();
    const [notification, setNotification] = useState<NotificationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNotification = async () => {
            try {
                // 从 URL 参数获取通知 ID
                const notificationId = searchParams.get('id');

                if (!notificationId) {
                    // 如果没有 ID,显示通用消息
                    setNotification({
                        id: 'general',
                        title: '消息通知',
                        content: '您收到了一条新的通知消息',
                        timestamp: new Date().toLocaleString('zh-CN'),
                    });
                    setLoading(false);
                    return;
                }

                // 获取通知详情
                const response = await fetch(`/api/notifications/${notificationId}`);

                if (!response.ok) {
                    throw new Error('获取通知详情失败');
                }

                const data = await response.json();
                setNotification(data);
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
                        <p className="mt-4 text-gray-600">加载中...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">加载失败</h2>
                        <p className="text-gray-600 text-center">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!notification) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center mb-2">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">消息通知</h1>
                            <p className="text-indigo-100 text-sm">{notification.timestamp}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Title */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">{notification.title}</h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"></div>
                    </div>

                    {/* Main Content */}
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                        <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                            {notification.content}
                        </p>
                    </div>

                    {/* Product Details (if available) */}
                    {(notification.productId || notification.style || notification.size) && (
                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                商品详情
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {notification.productId && (
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                        <p className="text-sm text-gray-500 mb-1">商品编号</p>
                                        <p className="font-semibold text-gray-800">{notification.productId}</p>
                                    </div>
                                )}
                                {notification.style && (
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                        <p className="text-sm text-gray-500 mb-1">款式</p>
                                        <p className="font-semibold text-gray-800">{notification.style}</p>
                                    </div>
                                )}
                                {notification.size && (
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                        <p className="text-sm text-gray-500 mb-1">尺寸</p>
                                        <p className="font-semibold text-gray-800">{notification.size}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 flex gap-4">
                        <a
                            href="/favorites"
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-center"
                        >
                            查看收藏
                        </a>
                        <a
                            href="/"
                            className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-center"
                        >
                            返回首页
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 text-center">
                        感谢您使用我们的服务 ❤️
                    </p>
                </div>
            </div>
        </div>
    );
}
