import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/_api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/_ws': {
                target: 'http://localhost:3000',
                ws: true,
            },
        },
    },
});
