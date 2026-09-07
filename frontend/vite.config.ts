import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// The backend's port; backend/src/config/env.js defaults to the same 4000.
const API_PORT = process.env.API_PORT ?? process.env.PORT ?? '4000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    // Listen on every interface so the site can be opened from a phone or a
    // second machine on the same wifi, by this machine's LAN address. Vite
    // prints those addresses at startup. The app still calls a relative
    // `/api/...` path, so the proxy below reaches the backend over the dev
    // server's own loopback no matter which address the browser came from —
    // which is why changing networks needs no config edit.
    host: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
