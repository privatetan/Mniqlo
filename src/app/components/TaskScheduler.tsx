import { useState } from 'react';

interface TaskSchedulerProps {
    isRunning: boolean;
    onStart: (interval: number, startStr: string, endStr: string) => void;
    onStop: () => void;
    executionCount: number;
    logs: string[];
    initialInterval?: number;
    initialStartTime?: string;
    initialEndTime?: string;
}

export function TaskScheduler({
    isRunning,
    onStart,
    onStop,
    executionCount,
    logs,
    initialInterval = 10 * 1000,
    initialStartTime = '00:00',
    initialEndTime = '23:59'
}: TaskSchedulerProps) {
    const [intervalSeconds, setIntervalSeconds] = useState<number>(initialInterval / 1000);
    const [startTime, setStartTime] = useState<string>(initialStartTime);
    const [endTime, setEndTime] = useState<string>(initialEndTime);

    const handleToggle = () => {
        if (isRunning) {
            onStop();
        } else {
            onStart(intervalSeconds * 1000, startTime, endTime);
        }
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full text-left">
            <h2 className="text-sm font-bold mb-3 text-gray-800 dark:text-gray-100">监控刷新</h2>

            <div className="mb-4 space-y-3">
                <div>
                    <label htmlFor="interval" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        刷新间隔 (秒)
                    </label>
                    <input
                        id="interval"
                        type="number"
                        min="1"
                        value={intervalSeconds}
                        onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 dark:text-gray-100"
                        disabled={isRunning}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            开始时间
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100"
                            disabled={isRunning}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            结束时间
                        </label>
                        <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-2 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-gray-100"
                            disabled={isRunning}
                        />
                    </div>
                </div>

                {isRunning && <p className="text-[10px] text-yellow-600 mt-1">停止任务以更改设置</p>}

                <div className="flex gap-2">
                    <button
                        onClick={handleToggle}
                        className={`flex-1 py-1.5 px-3 rounded text-sm font-semibold transition-all duration-200 ${isRunning
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                            : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30'
                            } shadow active:scale-95`}
                    >
                        {isRunning ? '停止' : '开始'}
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-500">执行次数</span>
                    <span className="text-sm font-bold text-blue-600">{executionCount}</span>
                </div>
                <div className="h-24 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-300">
                    {logs.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic text-center py-2">暂无执行记录</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="text-[10px] text-gray-600 dark:text-gray-400 font-mono truncate">
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
