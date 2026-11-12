// Service Worker «Делаешь?»: ловит нажатия на кнопки в системном уведомлении
// и передаёт ответ открытой вкладке приложения.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  const action = event.action; // '' (клик по самому уведомлению), 'doing', 'distracted', 'done', 'still'
  const data = event.notification.data || {};
  event.notification.close();

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (data.test) return; // пробное уведомление ничего не записывает
      const answer = action === 'still' ? 'doing' : action || null;
      for (const tab of tabs) {
        tab.postMessage({ type: 'nudge-answer', answer, nudgeAt: data.at });
      }
      // «Сделал!» и клик по уведомлению открывают вкладку, остальные ответы молчат.
      if (!action || action === 'done') {
        if (tabs[0]) await tabs[0].focus();
        else await self.clients.openWindow('/');
      }
    })(),
  );
});
