import { useState, useRef, useEffect, useCallback } from 'react';
import { FavoriteItem } from '@/types';
import { TaskScheduler } from './TaskScheduler';
import { useScheduledTask } from '@/hooks/useScheduledTask';

interface FavoriteItemRowProps {
    item: FavoriteItem;
    stockStatus: boolean | null;
    onRemove: (e: React.MouseEvent, key: string) => void;
    onCheckSingle: (item: FavoriteItem) => Promise<boolean>;
}

export function FavoriteItemRow({ item, stockStatus, onRemove, onCheckSingle }: FavoriteItemRowProps) {
    const [showScheduler, setShowScheduler] = useState(false);
    const [localStockStatus, setLocalStockStatus] = useState<boolean | null>(stockStatus);
    const popupRef = useRef<HTMLDivElement>(null);

    // Hoisted state for scheduled task
    const [executionCount, setExecutionCount] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [intervalMs, setIntervalMs] = useState<number>(2000);
    const [timeWindow, setTimeWindow] = useState<{ start: string; end: string } | null>(null);

    // Sync local status if parent updates it
    useEffect(() => {
        if (stockStatus !== undefined) {
            setLocalStockStatus(stockStatus);
        }
    }, [stockStatus]);

    const handleCheck = useCallback(async () => {
        if (timeWindow) {
            const now = new Date();
            const currentHm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            const { start, end } = timeWindow;

            let isInWindow = false;
            if (start <= end) {
                isInWindow = currentHm >= start && currentHm <= end;
            } else {
                // Crosses midnight
                isInWindow = currentHm >= start || currentHm <= end;
            }

            if (!isInWindow) {
                // Optional: log skip or just return silent? User might wonder if it's working.
                // Let's log it occasionally or just once? "Skipped (Outside window)"
                const timestamp = now.toLocaleTimeString();
                // Limit logs to avoid spamming "Skipped" every 2 seconds
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
    }, [item, onCheckSingle, timeWindow]);

    // Use hook here so it persists even if popup closes
    const { isRunning, start, stop } = useScheduledTask(handleCheck, intervalMs);

    const handleStart = (ms: number, startTime: string, endTime: string) => {
        setIntervalMs(ms);
        setTimeWindow({ start: startTime, end: endTime });
        // Defer start to Ensure interval updates first if needed, though hook handles dependency change
        setTimeout(() => {
            start();
            setShowScheduler(false); // Auto-close popup on start
        }, 0);
    };

    // Handle clicking outside to close popup
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowScheduler(false);
            }
        }
        if (showScheduler) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showScheduler]);

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
                className={`flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm relative z-10 transition-transform duration-200 ease-out overflow-visible group ${isSwiped ? '-translate-x-20' : 'translate-x-0'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-sm text-gray-900 truncate flex-1 mr-2">
                            {item.code && <span className="font-mono text-green-500 mr-2">{item.code}</span>}
                            {item.name}
                        </h3>
                        <div className="flex items-center gap-2">
                            {localStockStatus !== undefined && localStockStatus !== null && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${localStockStatus
                                    ? 'bg-green-50 text-green-600 border-green-100'
                                    : 'bg-red-50 text-red-500 border-red-100'
                                    }`}>
                                    {localStockStatus ? '有货' : '售罄'}
                                </span>
                            )}

                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowScheduler(!showScheduler);
                                    }}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${isRunning
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                >
                                    {isRunning ? '监控中...' : '监控'}
                                </button>
                            </div>

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
                        <span className="text-gray-500 text-xs px-2 py-0.5 bg-gray-100 rounded-full">{item.color}</span>
                        <span className="text-gray-500 text-xs px-2 py-0.5 bg-gray-100 rounded-full">{item.size}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <span className="font-bold text-red-600">¥{item.price}</span>
                        <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            {showScheduler && (
                <div
                    ref={popupRef}
                    className="absolute right-4 top-14 z-50 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 p-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <TaskScheduler
                        isRunning={isRunning}
                        onStart={handleStart}
                        onStop={stop}
                        executionCount={executionCount}
                        logs={logs}
                        initialInterval={intervalMs}
                        initialStartTime={timeWindow?.start}
                        initialEndTime={timeWindow?.end}
                    />
                </div>
            )}
        </div>
    );
}
