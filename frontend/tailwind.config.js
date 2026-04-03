/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                display: ['"Playfair Display"', 'serif'],
                body: ['"DM Sans"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                cream: {
                    50: '#FDFAF5',
                    100: '#F9F3E8',
                    200: '#F2E8D5',
                },
                espresso: {
                    700: '#3D2B1F',
                    800: '#2C1F16',
                    900: '#1A1208',
                },
                sand: {
                    300: '#C8A882',
                    400: '#B8936A',
                    500: '#A07850',
                },
                sage: {
                    400: '#8FAF8A',
                    500: '#6E9468',
                    600: '#527550',
                },
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.4s ease-out forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}