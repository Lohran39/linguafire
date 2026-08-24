// Service Worker para notificações push
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || '🔥 LinguaFire';
  const body = data.body || 'Hora de estudar! Não perca sua sequência!';
  const icon = '/favicon.svg';
  const url = data.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag: 'linguafire-notification',
      badge: icon,
      data: { url },
      requireInteraction: false,
      actions: [
        { action: 'open', title: 'Abrir LinguaFire' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients[0]) return clients[0].focus();
      return self.clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
