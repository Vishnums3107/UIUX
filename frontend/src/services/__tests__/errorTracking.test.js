import { describe, expect, test } from 'vitest';
import { buildRuntimeErrorPayload, mapRuntimeErrorSeverity } from '../errorTracking';

describe('errorTracking', () => {
    test('maps chunk load failures to high severity', () => {
        const severity = mapRuntimeErrorSeverity('ChunkLoadError: Loading chunk 7 failed', 'window.unhandledrejection');
        expect(severity).toBe('high');
    });

    test('maps known browser noise to low severity', () => {
        const severity = mapRuntimeErrorSeverity('ResizeObserver loop limit exceeded', 'window.error');
        expect(severity).toBe('low');
    });

    test('buildRuntimeErrorPayload trims and shapes payload', () => {
        const payload = buildRuntimeErrorPayload(new Error('Unexpected render failure'), {
            source: 'react.error_boundary',
            component: 'Dashboard'
        });

        expect(payload).not.toBeNull();
        expect(payload.source).toBe('react.error_boundary');
        expect(payload.message).toContain('Unexpected render failure');
        expect(payload.context.route).toBe(window.location.pathname);
        expect(payload.context.component).toBe('Dashboard');
    });

    test('returns null for telemetry self-report payloads', () => {
        const payload = buildRuntimeErrorPayload('/api/telemetry/frontend-error failed', {
            source: 'window.error'
        });

        expect(payload).toBeNull();
    });
});