import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FavoriteItem } from '@/types';
import { useScheduledTask } from '@/hooks/useScheduledTask';
import { parseLocalTime } from '@/lib/date-utils';

interface MonitorSchedulerModalProps {
    item: FavoriteItem;
    isOpen: boolean;
    onClose: () => void;
    onCheckSingle: (item: FavoriteItem) => Promise<boolean>;
    onStockStatusChange: (status: boolean) => void;
}

export function MonitorSchedulerModal({
    item,
    isOpen,
    onClose,
    onCheckSingle,
    onStockStatusChange
}: MonitorSchedulerModalProps) {
    // State management
    const [executionCount, setExecutionCount] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [intervalMs, setIntervalMs] = useState<number>(2000);
    const [timeWindow, setTimeWindow] = useState<{ start: string; end: string } | null>(null);
    const [taskId, setTaskId] = useState<number | null>(null);
    const [localStockStatus, setLocalStockStatus] = useState<boolean | null>(null);
    const [mounted, setMounted] = useState(false);

    // Use a ref for next allowed notification time to avoid re-renders and closure staleness issues
    const nextNotifyTime = useRef<number>(0);

    // Client-side mount check
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Load task configuration
    useEffect(() => {
        if (!isOpen) return;

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
    }, [item, isOpen]);

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
        onStockStatusChange(isAvailable);

        // Notify if newly available
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
    }, [item, onCheckSingle, timeWindow, taskId, onStockStatusChange]);

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
        }, 0);
    };

    const handleStop = () => {
        stop();
        handleSaveTask(false);
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md sm:max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-br from-white to-blue-50/30 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            <h2 className="text-lg sm:text-xl font-black text-gray-900">监控任务设置</h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{item.name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
                    {/* Enable/Disable Toggle */}
                    <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl border border-gray-100">
                        <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
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
                                className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <div>
                                <span className="text-sm font-bold text-gray-900">启用监控</span>
                                <p className="text-xs text-gray-500 mt-0.5">自动检查库存状态并推送通知</p>
                            </div>
                        </label>
                    </div>

                    {/* Interval Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">检查间隔</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={intervalMs / 1000}
                                onChange={(e) => setIntervalMs(parseInt(e.target.value) * 1000 || 2000)}
                                className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
                                min="2"
                                disabled={isRunning}
                            />
                            <span className="text-sm text-gray-500 font-medium">秒</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 sm:mt-2">最小间隔为 2 秒</p>
                    </div>

                    {/* Time Window */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5 sm:mb-2">监控时间段</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="time"
                                value={timeWindow?.start || '00:00'}
                                onChange={(e) => setTimeWindow({ start: e.target.value, end: timeWindow?.end || '23:59' })}
                                className="flex-1 px-2 py-2 sm:px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                                disabled={isRunning}
                            />
                            <span className="text-gray-400 text-sm">-</span>
                            <input
                                type="time"
                                value={timeWindow?.end || '23:59'}
                                onChange={(e) => setTimeWindow({ start: timeWindow?.start || '00:00', end: e.target.value })}
                                className="flex-1 px-2 py-2 sm:px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                                disabled={isRunning}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 sm:mt-2">仅在此时间段内执行监控</p>
                    </div>

                    {/* Status Info */}
                    <div className="bg-blue-50 p-3 sm:p-4 rounded-2xl border border-blue-100">
                        <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 sm:mb-3">任务状态</h3>
                        <div className="space-y-1.5 sm:space-y-2 text-sm">
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
                        <summary className="p-3 sm:p-4 cursor-pointer font-bold text-sm text-gray-700 hover:bg-gray-100 transition-colors">执行日志 ({logs.length})</summary>
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1 max-h-40 sm:max-h-48 overflow-y-auto">
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
                <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 sm:py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        取消
                    </button>
                    {isRunning ? (
                        <button
                            onClick={() => {
                                handleStop();
                                onClose();
                            }}
                            className="flex-1 py-2.5 sm:py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                        >
                            关闭监控
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                handleStart(intervalMs, timeWindow?.start || '00:00', timeWindow?.end || '23:59');
                            }}
                            className="flex-1 py-2.5 sm:py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                        >
                            开始监控
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
