import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteItem } from '@/types';
import { useScheduledTask } from '@/hooks/useScheduledTask';
import { parseLocalTime } from '@/lib/date-utils';

interface FavoriteItemRowProps {
    item: FavoriteItem;
    stockStatus: boolean | null;
    onRemove: (e: React.MouseEvent, key: string) => void;
    onCheckSingle: (item: FavoriteItem) => Promise<boolean>;
    hideProductInfo?: boolean;
    originPrice?: number;
}

export function FavoriteItemRow({ item, stockStatus, onRemove, onCheckSingle, hideProductInfo = false, originPrice }: FavoriteItemRowProps) {
    const router = useRouter();
    const [showScheduler, setShowScheduler] = useState(false);
    const [localStockStatus, setLocalStockStatus] = useState<boolean | null>(stockStatus);

    // Hoisted state for scheduled task
    const [executionCount, setExecutionCount] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [intervalMs, setIntervalMs] = useState<number>(2000);
    const [timeWindow, setTimeWindow] = useState<{ start: string; end: string } | null>(null);
    const [taskId, setTaskId] = useState<number | null>(null);

    // Sync local status if parent updates it
    useEffect(() => {
        if (stockStatus !== undefined) {
            setLocalStockStatus(stockStatus);
        }
    }, [stockStatus]);

    // Load task configuration
    useEffect(() => {
        const loadTask = async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const user = JSON.parse(userStr);

            if (user.id === -1) return; // Skip for guest

            try {
                const res = await fetch(`/api/tasks?userId=${user.id}&productId=${item.productId}&style=${item.color}&size=${item.size}`);
                const data = await res.json();
                if (data.success && data.tasks.length > 0) {
                    const task = data.tasks[0];
                    setTaskId(task.id);
                    setIntervalMs(task.frequency * 1000);

                    // Restore time window
                    if (task.startTime && task.endTime) {
                        setTimeWindow({ start: task.startTime, end: task.endTime });
                    }

                    // Restore logs
                    if (task.logs) {
                        setLogs(task.logs.map((l: any) => `执行时间 ${parseLocalTime(l.timestamp).toLocaleTimeString()} - ${l.message || l.status}`));
                    }

                    // Auto-start if active
                    if (task.isActive) {
                        // Use a small timeout to ensure state updates (interval/timeWindow) are processed
                        setTimeout(() => {
                            start();
                        }, 100);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadTask();
    }, [item]); // Remove start dependency to avoid loop, or keep if stable

    // Use a ref for next allowed notification time to avoid re-renders and closure staleness issues
    const nextNotifyTime = useRef<number>(0);

    const handleCheck = useCallback(async () => {
        console.log('handleCheck');
        if (timeWindow) {
            const now = new Date();
            const currentHm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            const { start, end } = timeWindow;

            let isInWindow = false;
            if (start <= end) {
                isInWindow = currentHm >= start && currentHm <= end;
            } else {
                isInWindow = currentHm >= start || currentHm <= end;
            }

            if (!isInWindow) {
                const timestamp = now.toLocaleTimeString();
                setLogs((prev) => {
                    const lastLog = prev[0];
                    if (lastLog && lastLog.includes('不在监控时间段')) return prev;
                    return [`执行时间 ${timestamp} - 不在监控时间段 (${start}-${end})`, ...prev].slice(0, 5);
                });
                return;
            }
        }

        setExecutionCount((c) => c + 1);
        const isAvailable = await onCheckSingle(item);

        const timestamp = new Date().toLocaleTimeString();
        const statusText = isAvailable ? '有货' : '售罄';
        setLogs((prev) => [`执行时间 ${timestamp} - ${statusText}`, ...prev].slice(0, 5));
        setLocalStockStatus(isAvailable);

        // Notify if newly available
        console.log('isAvailable', isAvailable);
        // Notify logic with frequency handling
        console.log('isAvailable', isAvailable);

        if (isAvailable) {

            const nowMs = Date.now();
            if (nowMs >= nextNotifyTime.current) {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        if (user.username) {
                            // Optimistically set next time
                            nextNotifyTime.current = nowMs + 60 * 1000;

                            setLogs(prev => [`[发出通知请求] ...`, ...prev].slice(0, 5));

                            fetch('/api/notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    username: user.username,
                                    productId: item.productId,
                                    style: item.color,
                                    size: item.size,
                                    title: `库存通知: ${item.name}`,
                                    content: `您监控的商品 [${item.code}] ${item.name} (${item.color}/${item.size}) 现在有货了！\n刷新时间: ${timestamp}`
                                })
                            }).then(res => res.json()).then(data => {
                                if (data.success) {
                                    if (data.skipped) {
                                        setLogs(prev => [`[限流] 剩余 ${data.remainingMinutes ?? '?'} 分钟`, ...prev].slice(0, 5));
                                        if (data.remainingMinutes) {
                                            nextNotifyTime.current = Date.now() + (data.remainingMinutes * 60 * 1000);
                                        } else {
                                            nextNotifyTime.current = Date.now() + 60 * 1000;
                                        }
                                    } else {
                                        setLogs(prev => [`[通知成功] 微信已发送`, ...prev].slice(0, 5));
                                        const freq = data.frequency || 60;
                                        nextNotifyTime.current = Date.now() + (freq * 60 * 1000);
                                    }
                                } else {
                                    setLogs(prev => [`[通知失败] ${data.message || '未知错误'}`, ...prev].slice(0, 5));
                                    nextNotifyTime.current = 0; // Reset to retry
                                }
                            }).catch(err => {
                                setLogs(prev => [`[网络错误] ${err.message}`, ...prev].slice(0, 5));
                                nextNotifyTime.current = 0;
                            });
                        } else {
                            setLogs(prev => [`[错误] 用户名缺失`, ...prev].slice(0, 5));
                        }
                    } catch (e) {
                        console.error('Failed to send notification:', e);
                        nextNotifyTime.current = 0;
                    }
                } else {
                    setLogs(prev => [`[错误] 未登录`, ...prev].slice(0, 5));
                }
            } else {
                // Throttled locally
                // console.log('Throttled locally');
            }
        } else {
            // If out of stock, allow immediate notification next time it's in stock
            nextNotifyTime.current = 0;
        }

        if (taskId) {
            try {
                await fetch('/api/tasks/logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        taskId,
                        status: isAvailable ? 'SUCCESS' : 'FAILURE',
                        message: statusText
                    })
                });
            } catch (e) { console.error(e); }
        }
    }, [item, onCheckSingle, timeWindow, taskId]); // Removed lastNotifiedStatus dependency

    // Use hook here so it persists even if popup closes
    const { isRunning, start, stop } = useScheduledTask(handleCheck, intervalMs);

    const handleSaveTask = async (active: boolean, ms?: number, startStr?: string | null, endStr?: string | null) => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        try {
            const freq = ms ? ms / 1000 : intervalMs / 1000;
            // Handle null vs undefined vs empty string carefully
            const sTime = startStr !== undefined ? startStr : (timeWindow?.start || null);
            const eTime = endStr !== undefined ? endStr : (timeWindow?.end || null);

            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    productId: item.productId,
                    productName: item.name,
                    productCode: item.code,
                    style: item.color,
                    size: item.size,
                    frequency: freq,
                    isActive: active,
                    startTime: sTime,
                    endTime: eTime
                })
            });
            const data = await res.json();
            if (data.success) {
                setTaskId(data.task.id);
            }
        } catch (e) { console.error(e); }
    };

    const handleStart = (ms: number, startTime: string, endTime: string) => {
        setIntervalMs(ms);
        setTimeWindow({ start: startTime, end: endTime });
        handleSaveTask(true, ms, startTime, endTime);
        setTimeout(() => {
            start();
            // popup stays open
        }, 0);
    };

    const handleStop = () => {
        stop();
        handleSaveTask(false);
    };

    const handleCodeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/?code=${item.code}`);
    };



    // Swipe logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [isSwiped, setIsSwiped] = useState(false);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
        setShowScheduler(false); // Close popup on interaction
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            setIsSwiped(true);
        } else if (isRightSwipe) {
            setIsSwiped(false);
        }
    };

    const handleClick = () => {
        if (isSwiped) setIsSwiped(false);
    };

    return (
        <div className="relative select-none touch-pan-y" onClick={handleClick}>
            {/* Delete Background */}
            <div
                className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-end px-6 cursor-pointer"
                onClick={(e) => onRemove(e, item.key)}
            >
                <span className="text-white font-medium text-sm">删除</span>
            </div>

            {/* Foreground Content */}
            <div
                className={`flex gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm relative z-10 transition-transform duration-200 ease-out overflow-visible group ${isSwiped ? '-translate-x-20' : 'translate-x-0'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="flex-1 min-w-0">
                    {hideProductInfo ? (
                        // Single line layout
                        <div className="flex items-center justify-between h-full">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.color}</span>
                                    <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.size}</span>
                                </div>
                                <span className="font-bold text-red-600">¥{item.price}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {localStockStatus !== undefined && localStockStatus !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${localStockStatus
                                        ? 'bg-green-50 text-green-600 border-green-100'
                                        : 'bg-red-50 text-red-500 border-red-100'
                                        }`}>
                                        {localStockStatus ? '有货' : '售罄'}
                                    </span>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const userStr = localStorage.getItem('user');
                                        if (userStr && JSON.parse(userStr).id === -1) {
                                            alert('游客无法使用监控功能，请注册登录');
                                            return;
                                        }
                                        setShowScheduler(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-all hover:scale-110"
                                    title="监控设置"
                                >
                                    {isRunning ? (
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </button>

                                <button
                                    onClick={(e) => onRemove(e, item.key)}
                                    className="text-gray-400 hover:text-red-500 p-1 bg-transparent"
                                    title="删除收藏"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Default stacked layout
                        <>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex-1 mr-2 flex items-baseline gap-2 truncate">
                                    <h3 className="font-medium text-sm text-gray-900 truncate">
                                        {item.code && (
                                            <span
                                                className="font-mono text-green-500 mr-2 cursor-pointer hover:underline"
                                                onClick={handleCodeClick}
                                            >
                                                {item.code}
                                            </span>
                                        )}
                                        {item.name}
                                    </h3>
                                    {originPrice && (
                                        <span className="text-xs text-gray-400 line-through shrink-0">¥{originPrice}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {localStockStatus !== undefined && localStockStatus !== null && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${localStockStatus
                                            ? 'bg-green-50 text-green-600 border-green-100'
                                            : 'bg-red-50 text-red-500 border-red-100'
                                            }`}>
                                            {localStockStatus ? '有货' : '售罄'}
                                        </span>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const userStr = localStorage.getItem('user');
                                            if (userStr && JSON.parse(userStr).id === -1) {
                                                alert('游客无法使用监控功能，请注册登录');
                                                return;
                                            }
                                            setShowScheduler(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-all hover:scale-110"
                                        title="监控设置"
                                    >
                                        {isRunning ? (
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </button>

                                    <button
                                        onClick={(e) => onRemove(e, item.key)}
                                        className="text-gray-400 hover:text-red-500 p-1 -mr-2 bg-transparent"
                                        title="删除收藏"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.color}</span>
                                <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.size}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="font-bold text-red-600">¥{item.price}</span>
                                <span className="text-xs text-gray-400">{parseLocalTime(item.timestamp).toLocaleDateString()}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {showScheduler && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-br from-white to-blue-50/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">监控任务设置</h2>
                                    <p className="text-sm text-gray-500 mt-1 truncate">{item.name}</p>
                                </div>
                                <button
                                    onClick={() => setShowScheduler(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5">
                            {/* Enable/Disable Toggle */}
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isRunning}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                handleStart(intervalMs, timeWindow?.start || '00:00', timeWindow?.end || '23:59');
                                            } else {
                                                handleStop();
                                            }
                                        }}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-gray-900">启用监控</span>
                                        <p className="text-xs text-gray-500 mt-0.5">自动检查库存状态并推送通知</p>
                                    </div>
                                </label>
                            </div>

                            {/* Interval Input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">检查间隔</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={intervalMs / 1000}
                                        onChange={(e) => setIntervalMs(parseInt(e.target.value) * 1000 || 2000)}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
                                        min="2"
                                        disabled={isRunning}
                                    />
                                    <span className="text-sm text-gray-500 font-medium">秒</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">最小间隔为 2 秒</p>
                            </div>

                            {/* Time Window */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">监控时间段</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={timeWindow?.start || '00:00'}
                                        onChange={(e) => setTimeWindow({ start: e.target.value, end: timeWindow?.end || '23:59' })}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        disabled={isRunning}
                                    />
                                    <span className="text-gray-400">-</span>
                                    <input
                                        type="time"
                                        value={timeWindow?.end || '23:59'}
                                        onChange={(e) => setTimeWindow({ start: timeWindow?.start || '00:00', end: e.target.value })}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                        disabled={isRunning}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">仅在此时间段内执行监控</p>
                            </div>

                            {/* Status Info */}
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-3">任务状态</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">执行次数:</span>
                                        <span className="font-mono text-gray-900 font-bold">{executionCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">当前状态:</span>
                                        <span className={`font-bold ${localStockStatus ? 'text-green-600' : 'text-red-600'}`}>
                                            {localStockStatus === null ? '未检查' : localStockStatus ? '有货' : '售罄'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Execution Logs */}
                            <details className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                                <summary className="p-4 cursor-pointer font-bold text-sm text-gray-700 hover:bg-gray-100 transition-colors">执行日志 ({logs.length})</summary>
                                <div className="px-4 pb-4 space-y-1 max-h-48 overflow-y-auto">
                                    {logs.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic text-center py-2">暂无执行记录</p>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div key={i} className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded">
                                                {log}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </details>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowScheduler(false)}
                                className="flex-1 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                            >
                                取消
                            </button>
                            {isRunning ? (
                                <button
                                    onClick={() => {
                                        handleStop();
                                        setShowScheduler(false);
                                    }}
                                    className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                                >
                                    关闭监控
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleStart(intervalMs, timeWindow?.start || '00:00', timeWindow?.end || '23:59');
                                    }}
                                    className="flex-1 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                                >
                                    开始监控
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
