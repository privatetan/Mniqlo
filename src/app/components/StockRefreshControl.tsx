import { useState } from 'react';
import { TaskScheduler } from './TaskScheduler';
import { useScheduledTask } from '@/hooks/useScheduledTask';

interface StockRefreshControlProps {
    onRefresh: () => void;
}

export function StockRefreshControl({ onRefresh }: StockRefreshControlProps) {
    const [executionCount, setExecutionCount] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);
    const [intervalMs, setIntervalMs] = useState<number>(2000);

    const handleTask = () => {
        setExecutionCount((c) => c + 1);
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [`Executed at ${timestamp}`, ...prev].slice(0, 5));
        onRefresh();
    };

    const { isRunning, start, stop } = useScheduledTask(handleTask, intervalMs);

    return (
        <div className="px-4 mb-4">
            <TaskScheduler
                isRunning={isRunning}
                onStart={(ms) => {
                    setIntervalMs(ms);
                    setTimeout(start, 0);
                }}
                onStop={stop}
                executionCount={executionCount}
                logs={logs}
            />
        </div>
    );
}
