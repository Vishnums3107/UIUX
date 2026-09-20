const royalBlue = {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
};

const skyBlue = {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
};

const indigoBlue = {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
};

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                tamil: royalBlue,
                ocean: skyBlue,

                // Blue-first aliases so existing semantic classes keep working.
                emerald: skyBlue,
                teal: skyBlue,
                yellow: royalBlue,
                amber: royalBlue,
                orange: skyBlue,
                pink: royalBlue,
                fuchsia: royalBlue,
                rose: indigoBlue,
                purple: indigoBlue,
                violet: indigoBlue,
            },
            fontFamily: {
                tamil: ['Noto Sans Tamil', 'Hind Madurai', 'sans-serif'],
                display: ['Sora', 'Nunito Sans', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'pulse-glow': 'pulseGlow 2s infinite',
                'scale-in': 'scaleIn 0.3s ease-out',
                'float-slow': 'floatSlow 11s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
                pulseGlow: { '0%, 100%': { boxShadow: '0 0 6px rgba(59,130,246,0.28)' }, '50%': { boxShadow: '0 0 20px rgba(14,165,233,0.36)' } },
                scaleIn: { '0%': { opacity: '0', transform: 'scale(0.9)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
                floatSlow: {
                    '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
                    '50%': { transform: 'translate3d(0, -14px, 0)' }
                },
            }
        },
    },
    plugins: [],
}
