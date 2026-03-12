import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: {
        timeout: 10_000
    },
    fullyParallel: false,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    reporter: isCI
        ? [['github'], ['html', { open: 'never' }]]
        : [['list']],
    use: {
        baseURL: 'http://127.0.0.1:4173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ],
    webServer: [
        {
            command: 'node ../backend/tests/e2e/start-test-server.js',
            url: 'http://127.0.0.1:5001/api/health',
            timeout: 10 * 60 * 1000,
            reuseExistingServer: !isCI,
            stdout: 'pipe',
            stderr: 'pipe'
        },
        {
            command: 'npm run dev -- --host 127.0.0.1 --port 4173',
            url: 'http://127.0.0.1:4173',
            reuseExistingServer: !isCI,
            stdout: 'pipe',
            stderr: 'pipe',
            env: {
                ...process.env,
                VITE_API_URL: 'http://127.0.0.1:5001/api'
            }
        }
    ]
});
