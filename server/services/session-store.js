const { Store } = require('express-session');
const { createHash } = require('node:crypto');

// Shared PostgreSQL storage through the existing server-only Supabase client.
class SupabaseSessionStore extends Store {
  constructor({ client, ttlMs = 86400000, cleanupMs = 3600000, logger }) {
    super();
    this.client = client;
    this.ttlMs = ttlMs;
    this.timer = cleanupMs > 0 ? setInterval(() => {
      this.prune().catch(() => logger?.error('Session cleanup failed', { code: 'session_cleanup_failed' }));
    }, cleanupMs) : null;
    this.timer?.unref();
  }
  key(sid) { return createHash('sha256').update(sid).digest('hex'); }
  expiry(value) {
    return new Date(value.cookie?.expires || Date.now() + this.ttlMs).toISOString();
  }
  complete(operation, callback = () => {}) {
    Promise.resolve().then(operation).then(value => callback(null, value), () => {
      callback(Object.assign(new Error('Session storage unavailable'), { code: 'SESSION_STORE_UNAVAILABLE' }));
    });
  }
  get(sid, callback) {
    this.complete(async () => {
      const { data, error } = await this.client.from('http_sessions').select('data,expires_at')
        .eq('sid_hash', this.key(sid)).maybeSingle();
      if (error) throw error;
      return data && Date.parse(data.expires_at) > Date.now() ? data.data : null;
    }, callback);
  }
  set(sid, value, callback) {
    this.complete(async () => {
      const { error } = await this.client.from('http_sessions').upsert({
        sid_hash: this.key(sid), data: value, expires_at: this.expiry(value)
      });
      if (error) throw error;
    }, callback);
  }
  touch(sid, value, callback) {
    this.complete(async () => {
      const { error } = await this.client.from('http_sessions').update({ expires_at: this.expiry(value) })
        .eq('sid_hash', this.key(sid)).gt('expires_at', new Date().toISOString());
      if (error) throw error;
    }, callback);
  }
  destroy(sid, callback) {
    this.complete(async () => {
      const { error } = await this.client.from('http_sessions').delete().eq('sid_hash', this.key(sid));
      if (error) throw error;
    }, callback);
  }
  async prune() {
    const { error } = await this.client.from('http_sessions').delete().lt('expires_at', new Date().toISOString());
    if (error) throw error;
  }
  close() { clearInterval(this.timer); }
}
module.exports = { SupabaseSessionStore };
