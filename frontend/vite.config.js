import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        globals: true,
        css: true,
        exclude: [
            'e2e/**',
            'node_modules/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{js,jsx}'],
            exclude: [
                'src/main.jsx',
                'src/test/**',
                'src/**/*.d.ts'
            ],
            thresholds: {
                lines: 5,
                functions: 5,
                branches: 5,
                statements: 5
            }
        }
    }
})
