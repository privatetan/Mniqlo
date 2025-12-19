import { useState, useEffect, useRef, useCallback } from 'react';

type UseScheduledTaskResult = {
    isRunning: boolean;
    start: () => void;
    stop: () => void;
    toggle: () => void;
};

/**
 * A hook to execute a callback function at a specified interval.
 * 
 * @param callback The function to execute.
 * @param interval The interval in milliseconds.
 * @returns Object containing isRunning state and control functions (start, stop, toggle).
 */
export function useScheduledTask(
    callback: () => void,
    interval: number
): UseScheduledTaskResult {
    const [isRunning, setIsRunning] = useState(false);
    const savedCallback = useRef(callback);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        if (!isRunning || interval === null) {
            return;
        }

        const id = setInterval(() => {
            savedCallback.current();
        }, interval);

        return () => clearInterval(id);
    }, [interval, isRunning]);

    const start = useCallback(() => setIsRunning(true), []);
    const stop = useCallback(() => setIsRunning(false), []);
    const toggle = useCallback(() => setIsRunning((prev) => !prev), []);

    return { isRunning, start, stop, toggle };
}
