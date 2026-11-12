// Установка сайта как отдельного приложения (PWA). Тогда в Windows у него
// своя строка в настройках уведомлений и его можно добавить в приоритет.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // покажем свою кнопку вместо значка браузера
  deferred = e as InstallEvent;
  emit();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  emit();
});

export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches;
export const canInstall = () => deferred !== null;
export const onInstallChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export async function install() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  emit();
}
