const webpush = require('web-push');

function createPushService(env = process.env, logger = console) {
  const publicKey = String(env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(env.VAPID_PRIVATE_KEY || '').trim();
  const subject = String(env.VAPID_SUBJECT || '').trim();

  const configured = Boolean(publicKey && privateKey && subject);
  if (configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  function isConfigured() {
    return configured;
  }

  function getPublicKey() {
    return publicKey;
  }

  async function send(subscription, payload) {
    if (!configured) {
      const error = new Error('VAPID nao configurado.');
      error.status = 501;
      throw error;
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    return webpush.sendNotification(pushSubscription, JSON.stringify(payload));
  }

  async function sendMany(subscriptions = [], payload) {
    const results = await Promise.allSettled(subscriptions.map((subscription) => send(subscription, payload)));
    const sent = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.length - sent;

    if (failed) {
      logger.warn?.('Falha ao enviar algumas notificacoes push', { sent, failed });
    }

    return { sent, failed };
  }

  return {
    isConfigured,
    getPublicKey,
    send,
    sendMany
  };
}

module.exports = { createPushService };
