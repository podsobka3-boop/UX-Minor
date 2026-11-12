// Системные уведомления с кнопками (только через Service Worker).
import type { NudgeEvent } from './storage';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('Service Worker не зарегистрирован', e);
  }
}

export async function askPermission() {
  if (!('Notification' in window)) return 'denied' as NotificationPermission;
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function showSystemNudge(ev: NudgeEvent, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const actions =
    ev.kind === 'done'
      ? [
          { action: 'done', title: 'Сделал!' },
          { action: 'still', title: 'Ещё делаю' },
        ]
      : [
          { action: 'doing', title: 'Делаю' },
          { action: 'distracted', title: 'Отвлёкся' },
        ];
  await reg.showNotification(ev.message, {
    body,
    tag: 'nudge',
    icon: '/icon.svg',
    data: { at: ev.at },
    requireInteraction: false,
    // поля ниже браузер понимает, но их нет в типах TypeScript
    ...({ actions, renotify: true } as object),
  });
}

export async function closeSystemNudges() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const list = await reg.getNotifications({ tag: 'nudge' });
  list.forEach((n) => n.close());
}

// Пробное уведомление: сразу видно, пропускают ли его браузер и Windows.
export async function showTestNotification() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Делаешь «проверку уведомлений»?', {
    body: 'Так будет выглядеть вопрос. Кнопки тоже работают.',
    tag: 'nudge-test',
    // renotify: повторная проверка снова всплывает баннером, а не тихо заменяет прошлую
    icon: '/icon.svg',
    data: { test: true },
    ...({ renotify: true, actions: [{ action: 'doing', title: 'Делаю' }, { action: 'distracted', title: 'Отвлёкся' }] } as object),
  });
}
