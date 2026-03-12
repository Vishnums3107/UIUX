import { useState, useRef, useCallback, useEffect } from 'react';

const IDLE_THRESHOLD = 30; // seconds

/**
 * Custom hook to track user interaction metrics for a lesson question.
 * Tracks: start time, completion time, errors, hint usage, retries, idle time.
 */
export function useInteractionTracker() {
    const [metrics, setMetrics] = useState({
        startTime: null,
        errors: 0,
        hintsUsed: 0,
        retries: 0,
        idleTime: 0,
    });

    const lastActivityRef = useRef(Date.now());
    const idleAccRef = useRef(0);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    // Start tracking for a new question
    const startTracking = useCallback(() => {
        const now = Date.now();
        startTimeRef.current = now;
        lastActivityRef.current = now;
        idleAccRef.current = 0;
        setMetrics({ startTime: now, errors: 0, hintsUsed: 0, retries: 0, idleTime: 0 });

        // Start idle detection timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const elapsed = (Date.now() - lastActivityRef.current) / 1000;
            if (elapsed >= IDLE_THRESHOLD) {
                idleAccRef.current += 1; // accumulate 1 second of idle per check
            }
        }, 1000);
    }, []);

    // Record user activity (resets idle timer)
    const recordActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    // Record an error
    const recordError = useCallback(() => {
        setMetrics(prev => ({ ...prev, errors: prev.errors + 1 }));
        recordActivity();
    }, [recordActivity]);

    // Record hint usage
    const recordHint = useCallback(() => {
        setMetrics(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
        recordActivity();
    }, [recordActivity]);

    // Record a retry
    const recordRetry = useCallback(() => {
        setMetrics(prev => ({ ...prev, retries: prev.retries + 1 }));
        recordActivity();
    }, [recordActivity]);

    // Complete tracking and return final metrics
    const completeTracking = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        const endTime = Date.now();
        const timeSpent = startTimeRef.current ? Math.round((endTime - startTimeRef.current) / 1000) : 0;

        return {
            time_spent: timeSpent,
            errors: metrics.errors,
            hints_used: metrics.hintsUsed,
            retries: metrics.retries,
            idle_time: idleAccRef.current,
        };
    }, [metrics]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return {
        metrics,
        startTracking,
        recordActivity,
        recordError,
        recordHint,
        recordRetry,
        completeTracking,
    };
}
