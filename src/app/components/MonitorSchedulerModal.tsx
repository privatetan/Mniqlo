import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FavoriteItem } from '@/types';
import { useScheduledTask } from '@/hooks/useScheduledTask';
import { parseLocalTime } from '@/lib/date-utils';
import { getUser } from '@/lib/session';
import { useLanguage } from '@/context/LanguageContext';

interface MonitorSchedulerModalProps {
    item: FavoriteItem;
    isOpen: boolean;
    onClose: () => void;
    onCheckSingle: (item: FavoriteItem) => Promise<boolean>;
    onStockStatusChange: (status: boolean) => void;
}

const MIN_INTERVAL_SECONDS = 2;
const DEFAULT_WINDOW = { start: '00:00', end: '23:59' };
const INTERVAL_PRESETS = [2, 5, 10, 30, 60];

function isInsideWindow(currentHm: string, start: string, end: string) {
    if (start <= end) return currentHm >= start && currentHm <= end;
    return currentHm >= start || currentHm <= end;
}

export function MonitorSchedulerModal({
    item,
    isOpen,
    onClose,
    onCheckSingle,
    onStockStatusChange
}: MonitorSchedulerModalProps) {
    const { t, language } = useLanguage();

    const [executionCount, setExecutionCount] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [intervalMs, setIntervalMs] = useState<number>(MIN_INTERVAL_SECONDS * 1000);
    const [intervalInput, setIntervalInput] = useState<string>(String(MIN_INTERVAL_SECONDS));
    const [timeWindow, setTimeWindow] = useState<{ start: string; end: string }>(DEFAULT_WINDOW);
    const [isAllDay, setIsAllDay] = useState(true);
    const [taskId, setTaskId] = useState<number | null>(null);
    const [localStockStatus, setLocalStockStatus] = useState<boolean | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isTaskLoading, setIsTaskLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCheckingNow, setIsCheckingNow] = useState(false);

    const nextNotifyTime = useRef<number>(0);

    const text = {
        running: language === 'zh' ? '运行中' : 'Running',
        stopped: language === 'zh' ? '已停止' : 'Stopped',
        monitorStatus: language === 'zh' ? '监控状态' : 'Monitor Status',
        runningDesc: language === 'zh' ? '按设定间隔自动检查库存' : 'Stock is checked automatically on schedule',
        stoppedDesc: language === 'zh' ? '先配置参数，再开始监控' : 'Configure options, then start monitoring',
        quickInterval: language === 'zh' ? '快捷间隔' : 'Quick Presets',
        allDay: language === 'zh' ? '全天监控' : 'All-day Monitoring',
        allDayDesc: language === 'zh' ? '开启后自动使用 00:00 - 23:59' : 'Uses 00:00 - 23:59 when enabled',
        checkNow: language === 'zh' ? '立即检测' : 'Check Now',
        checking: language === 'zh' ? '检测中...' : 'Checking...',
        saving: language === 'zh' ? '保存中...' : 'Saving...',
        loadingTask: language === 'zh' ? '读取已保存任务...' : 'Loading saved task...',
        variant: language === 'zh' ? '监控规格' : 'Variant',
        saveFailed: language === 'zh' ? '[保存失败]' : '[Save Failed]'
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    const pushLog = useCallback((message: string) => {
        setLogs((prev) => [message, ...prev].slice(0, 8));
    }, []);

    const handleCheck = useCallback(async () => {
        const now = new Date();
        const currentHm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const activeStart = isAllDay ? DEFAULT_WINDOW.start : timeWindow.start;
        const activeEnd = isAllDay ? DEFAULT_WINDOW.end : timeWindow.end;

        if (!isInsideWindow(currentHm, activeStart, activeEnd)) {
            pushLog(t('mon.log_exec', {
                t: now.toLocaleTimeString(),
                m: t('mon.log_window', { w: `${activeStart}-${activeEnd}` })
            }));
            return;
        }

        setExecutionCount((count) => count + 1);
        const isAvailable = await onCheckSingle(item);
        const timestamp = new Date().toLocaleTimeString();
        const statusText = isAvailable ? t('mon.in_stock') : t('mon.sold_out');

        pushLog(t('mon.log_exec', { t: timestamp, m: statusText }));
        setLocalStockStatus(isAvailable);
        onStockStatusChange(isAvailable);

        if (isAvailable) {
            const nowMs = Date.now();
            if (nowMs >= nextNotifyTime.current) {
                const user = getUser();
                if (user) {
                    try {
                        if (user.username) {
                            nextNotifyTime.current = nowMs + 60 * 1000;
                            pushLog(t('mon.notify_req'));

                            const notifyRes = await fetch('/api/notify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    username: user.username,
                                    productId: item.productId,
                                    style: item.color,
                                    size: item.size,
                                    title: t('mon.notify_title', { n: item.name }),
                                    content: t('mon.notify_content', {
                                        c: item.code,
                                        n: item.name,
                                        clr: item.color,
                                        s: item.size,
                                        t: timestamp
                                    })
                                })
                            });
                            const notifyData = await notifyRes.json();

                            if (notifyData.success) {
                                if (notifyData.skipped) {
                                    const remaining = notifyData.remainingMinutes ?? '?';
                                    pushLog(t('mon.notify_rate', { n: remaining }));
                                    if (notifyData.remainingMinutes) {
                                        nextNotifyTime.current = Date.now() + (notifyData.remainingMinutes * 60 * 1000);
                                    }
                                } else {
                                    pushLog(t('mon.notify_ok'));
                                    const freq = notifyData.frequency || 60;
                                    nextNotifyTime.current = Date.now() + (freq * 60 * 1000);
                                }
                            } else {
                                pushLog(t('mon.notify_err', { m: notifyData.message || 'unknown error' }));
                                nextNotifyTime.current = 0;
                            }
                        } else {
                            pushLog(t('mon.user_err'));
                        }
                    } catch (error) {
                        const message = error instanceof Error ? error.message : 'unknown error';
                        pushLog(t('mon.net_err', { m: message }));
                        nextNotifyTime.current = 0;
                    }
                } else {
                    pushLog(t('mon.login_err'));
                }
            }
        } else {
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
            } catch (error) {
                console.error(error);
            }
        }
    }, [isAllDay, item, onCheckSingle, onStockStatusChange, pushLog, t, taskId, timeWindow.end, timeWindow.start]);

    const { isRunning, start, stop } = useScheduledTask(handleCheck, intervalMs);

    const handleSaveTask = useCallback(async (active: boolean, ms?: number, startStr?: string | null, endStr?: string | null) => {
        const user = getUser();
        if (!user || user.id === -1) return false;

        try {
            const freq = ms ? ms / 1000 : intervalMs / 1000;
            const sTime = startStr !== undefined ? startStr : (isAllDay ? DEFAULT_WINDOW.start : timeWindow.start);
            const eTime = endStr !== undefined ? endStr : (isAllDay ? DEFAULT_WINDOW.end : timeWindow.end);

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
                return true;
            }

            pushLog(`${text.saveFailed} ${data.message || 'unknown error'}`);
            return false;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'unknown error';
            pushLog(`${text.saveFailed} ${message}`);
            return false;
        }
    }, [intervalMs, isAllDay, item.code, item.color, item.name, item.productId, item.size, pushLog, text.saveFailed, timeWindow.end, timeWindow.start]);

    const handleStart = useCallback(async () => {
        if (isSaving) return;

        const normalizedMs = Math.max(intervalMs, MIN_INTERVAL_SECONDS * 1000);
        const startTime = isAllDay ? DEFAULT_WINDOW.start : timeWindow.start;
        const endTime = isAllDay ? DEFAULT_WINDOW.end : timeWindow.end;

        setIntervalMs(normalizedMs);
        setIntervalInput(String(Math.floor(normalizedMs / 1000)));
        setTimeWindow({ start: startTime, end: endTime });

        setIsSaving(true);
        const saved = await handleSaveTask(true, normalizedMs, startTime, endTime);
        setIsSaving(false);

        if (saved) {
            start();
            await handleCheck();
        }
    }, [handleCheck, handleSaveTask, intervalMs, isAllDay, isSaving, start, timeWindow.end, timeWindow.start]);

    const handleStop = useCallback(async () => {
        if (isSaving) return;
        setIsSaving(true);
        const saved = await handleSaveTask(false);
        setIsSaving(false);
        if (saved) stop();
    }, [handleSaveTask, isSaving, stop]);

    const handleManualCheck = useCallback(async () => {
        if (isTaskLoading || isCheckingNow) return;
        setIsCheckingNow(true);
        try {
            await handleCheck();
        } finally {
            setIsCheckingNow(false);
        }
    }, [handleCheck, isCheckingNow, isTaskLoading]);

    const handleIntervalInputChange = (value: string) => {
        setIntervalInput(value);
        if (!value) return;

        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
            setIntervalMs(Math.max(parsed, MIN_INTERVAL_SECONDS) * 1000);
        }
    };

    const handleIntervalInputBlur = () => {
        const parsed = parseInt(intervalInput, 10);
        const safeValue = Number.isNaN(parsed) ? MIN_INTERVAL_SECONDS : Math.max(parsed, MIN_INTERVAL_SECONDS);
        setIntervalInput(String(safeValue));
        setIntervalMs(safeValue * 1000);
    };

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;

        const loadTask = async () => {
            setIsTaskLoading(true);
            setExecutionCount(0);
            setLocalStockStatus(null);
            setTaskId(null);
            setLogs([]);

            try {
                const user = getUser();
                if (!user || user.id === -1) {
                    stop();
                    return;
                }

                const res = await fetch(`/api/tasks?userId=${user.id}&productId=${item.productId}&style=${item.color}&size=${item.size}`);
                const data = await res.json();
                if (!data.success || data.tasks.length === 0 || cancelled) {
                    stop();
                    return;
                }

                const task = data.tasks[0];
                const seconds = Math.max(Number(task.frequency || MIN_INTERVAL_SECONDS), MIN_INTERVAL_SECONDS);
                const startTime = task.startTime || DEFAULT_WINDOW.start;
                const endTime = task.endTime || DEFAULT_WINDOW.end;
                const taskIsAllDay = startTime === DEFAULT_WINDOW.start && endTime === DEFAULT_WINDOW.end;

                setTaskId(task.id);
                setIntervalMs(seconds * 1000);
                setIntervalInput(String(seconds));
                setTimeWindow({ start: startTime, end: endTime });
                setIsAllDay(taskIsAllDay);

                if (Array.isArray(task.logs) && task.logs.length > 0) {
                    setLogs(task.logs.map((log: any) => t('mon.log_exec', {
                        t: parseLocalTime(log.timestamp).toLocaleTimeString(),
                        m: log.message || log.status
                    })));
                }

                if (task.isActive) {
                    start();
                } else {
                    stop();
                }
            } catch (error) {
                console.error(error);
                stop();
            } finally {
                if (!cancelled) {
                    setIsTaskLoading(false);
                }
            }
        };

        loadTask();

        return () => {
            cancelled = true;
        };
    }, [isOpen, item.color, item.productId, item.size, start, stop, t]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md sm:max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] sm:max-h-[85vh] flex flex-col">
                <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-br from-white to-blue-50/30 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                            <h2 className="text-lg sm:text-xl font-black text-gray-900">{t('mon.title')}</h2>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{item.name}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600 shrink-0"
                            aria-label={t('mon.cancel')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mt-3">
                        <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">{item.code}</span>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full">{item.color}</span>
                        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full">{item.size}</span>
                        <span className="text-[11px] text-slate-500">{text.variant}</span>
                    </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
                    {isTaskLoading ? (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 text-sm text-slate-500">
                            <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            {text.loadingTask}
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-50 p-3 sm:p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">{text.monitorStatus}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{isRunning ? text.runningDesc : text.stoppedDesc}</p>
                                    </div>
                                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${isRunning
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        {isRunning ? text.running : text.stopped}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <button
                                        onClick={handleManualCheck}
                                        disabled={isCheckingNow || isSaving}
                                        className="py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isCheckingNow ? text.checking : text.checkNow}
                                    </button>
                                    <button
                                        onClick={isRunning ? handleStop : handleStart}
                                        disabled={isSaving}
                                        className={`py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {isSaving ? text.saving : isRunning ? t('mon.stop') : t('mon.start')}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('mon.interval')}</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {INTERVAL_PRESETS.map((seconds) => {
                                        const selected = intervalMs / 1000 === seconds;
                                        return (
                                            <button
                                                key={seconds}
                                                type="button"
                                                onClick={() => {
                                                    setIntervalMs(seconds * 1000);
                                                    setIntervalInput(String(seconds));
                                                }}
                                                disabled={isRunning || isSaving}
                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selected
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                {seconds}{t('mon.interval_unit')}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={intervalInput}
                                        onChange={(event) => handleIntervalInputChange(event.target.value)}
                                        onBlur={handleIntervalInputBlur}
                                        className="flex-1 px-3 py-2 sm:px-4 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
                                        min={MIN_INTERVAL_SECONDS}
                                        disabled={isRunning || isSaving}
                                    />
                                    <span className="text-sm text-gray-500 font-medium">{t('mon.interval_unit')}</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1.5">{text.quickInterval} · {t('mon.interval_min')}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">{t('mon.window')}</label>
                                <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
                                    <input
                                        type="checkbox"
                                        checked={isAllDay}
                                        onChange={(event) => {
                                            const checked = event.target.checked;
                                            setIsAllDay(checked);
                                            if (checked) setTimeWindow(DEFAULT_WINDOW);
                                        }}
                                        disabled={isRunning || isSaving}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700 font-medium">{text.allDay}</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={timeWindow.start}
                                        onChange={(event) => setTimeWindow((prev) => ({ ...prev, start: event.target.value }))}
                                        className="flex-1 px-2 py-2 sm:px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                        disabled={isRunning || isAllDay || isSaving}
                                    />
                                    <span className="text-gray-400 text-sm">-</span>
                                    <input
                                        type="time"
                                        value={timeWindow.end}
                                        onChange={(event) => setTimeWindow((prev) => ({ ...prev, end: event.target.value }))}
                                        className="flex-1 px-2 py-2 sm:px-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                                        disabled={isRunning || isAllDay || isSaving}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1.5">{text.allDayDesc}</p>
                            </div>
                        </>
                    )}

                    <div className="bg-blue-50 p-3 sm:p-4 rounded-2xl border border-blue-100">
                        <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 sm:mb-3">{t('mon.status')}</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">{t('mon.count')}:</span>
                                <span className="font-mono text-gray-900 font-bold">{executionCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">{t('mon.curr_status')}:</span>
                                <span className={`font-bold ${localStockStatus ? 'text-green-600' : 'text-red-600'}`}>
                                    {localStockStatus === null ? t('mon.unchecked') : localStockStatus ? t('mon.in_stock') : t('mon.sold_out')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <details className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        <summary className="p-3 sm:p-4 cursor-pointer font-bold text-sm text-gray-700 hover:bg-gray-100 transition-colors">{t('mon.logs', { n: logs.length })}</summary>
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1 max-h-48 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-xs text-gray-400 italic text-center py-2">{t('mon.no_logs')}</p>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={`${log}-${index}`} className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded border border-gray-100">
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                    </details>
                </div>

                <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 sm:py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        {t('mon.cancel')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
