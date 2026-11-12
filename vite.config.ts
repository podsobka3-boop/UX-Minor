import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 127.0.0.1, а не localhost: на некоторых Windows localhost уходит в IPv6 и браузер не достучится
  server: { host: '127.0.0.1', port: 5173 },
});
