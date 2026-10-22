import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], server: { port: 3046, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3047' } }, preview: { port: 3046 } });
