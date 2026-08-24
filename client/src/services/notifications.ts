const SERVICE_WORKER_PATH = '/sw-push.js';

export function supportsPushNotifications() {
  return 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao processar notificacoes');
  }
  return data;
}

async function registerServiceWorker() {
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: '/' });
}

export async function getPushStatus() {
  const data = await parseJson<{ subscribed: boolean }>(
    await fetch('/api/push/status', {
      credentials: 'include'
    })
  );
  return data.subscribed;
}

async function getVapidPublicKey() {
  const data = await parseJson<{ configured: boolean; publicKey: string }>(
    await fetch('/api/push/public-key', {
      credentials: 'include'
    })
  );

  if (!data.configured || !data.publicKey) {
    throw new Error('Notificacoes push ainda nao configuradas no servidor.');
  }

  return data.publicKey;
}

export async function subscribeToPush() {
  if (!supportsPushNotifications()) {
    throw new Error('Este navegador nao suporta notificacoes push.');
  }

  const vapidPublicKey = await getVapidPublicKey();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissao de notificacao nao concedida.');
  }

  const registration = await registerServiceWorker();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  await parseJson<{ success: boolean }>(
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subscription)
    })
  );
}

export async function unsubscribeFromPush() {
  if (supportsPushNotifications()) {
    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  }

  await parseJson<{ success: boolean }>(
    await fetch('/api/push/unsubscribe', {
      method: 'DELETE',
      credentials: 'include'
    })
  );
}
