import { spawn } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const URL = 'http://127.0.0.1:5173/';

// После запуска `npm run dev` открываем приложение сразу отдельным окном,
// без вкладок и адресной строки (режим приложения Microsoft Edge).
// На других системах — просто в браузере по умолчанию.
function openAsApp(): Plugin {
  return {
    name: 'open-as-app',
    apply: 'serve',
    configureServer(server) {
      if (process.platform !== 'win32') return;
      server.httpServer?.once('listening', () => {
        spawn('cmd', ['/c', 'start', 'msedge', `--app=${URL}`], { detached: true, stdio: 'ignore' }).unref();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), openAsApp()],
  // 127.0.0.1, а не localhost: на некоторых Windows localhost уходит в IPv6 и браузер не достучится.
  // strictPort: если порт занят, лучше явная ошибка, чем окно с неправильным адресом.
  server: { host: '127.0.0.1', port: 5173, strictPort: true, open: process.platform !== 'win32' },
});
