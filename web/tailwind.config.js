/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'bg-base': '#0d1117',
                'bg-sidecar': '#161b22',
                divider: '#21262d',
                accent: '#58a6ff',
            },
        },
    },
    plugins: [],
};
