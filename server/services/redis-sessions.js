const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');

function createRedisSessions({ url, logger, clientFactory = createClient }) {
  if (!url || !/^rediss?:\/\//.test(url)) throw new Error('REDIS_URL is required for Redis sessions');
  const client = clientFactory({ url, disableOfflineQueue: true,
    socket: { connectTimeout: 5000, reconnectStrategy: retries => Math.min(250 * (retries + 1), 3000) } });
  client.on('error', () => logger?.error('Redis unavailable', { code: 'redis_unavailable' }));
  client.on('ready', () => logger?.info('Redis ready'));
  const store = new RedisStore({ client, prefix: 'linguafire:session:', ttl: 86400 });
  return { store, client, async connect() {
    let timer;
    try {
      await Promise.race([client.connect(), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Redis connection timeout')), 15000);
      })]);
    } catch (error) { if (client.isOpen) client.destroy(); throw error; }
    finally { clearTimeout(timer); }
  } };
}
module.exports = { createRedisSessions };
