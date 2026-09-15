const BUCKET = 'profile-avatars';
const missing = error => Number(error?.statusCode) === 404
  || ['NoSuchKey', 'NoSuchBucket', 'not_found'].includes(error?.code)
  || ['Object not found', 'Bucket not found'].includes(error?.message);

function createAvatarStorage(client) {
  let bucketReady;
  function ensureBucket() {
    if (!bucketReady) bucketReady = (async () => {
      const { data, error } = await client.storage.listBuckets();
      if (error) throw error;
      if (data?.some(bucket => bucket.name === BUCKET)) return;
      const created = await client.storage.createBucket(BUCKET, {
        public: false, fileSizeLimit: 600 * 1024, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });
      if (created.error && !/already exists|duplicate/i.test(created.error.message || '')) throw created.error;
    })().catch(error => { bucketReady = null; throw error; });
    return bucketReady;
  }
  return {
    async upload(userId, bytes, contentType) {
      try {
        await ensureBucket();
        const { error } = await client.storage.from(BUCKET).upload(`${userId}/avatar`, bytes, { contentType, cacheControl: '0', upsert: true });
        if (error) throw error;
        return { success: true };
      } catch (error) { return { error: error.message || 'Falha ao salvar foto' }; }
    },
    async get(userId) {
      const { data, error } = await client.storage.from(BUCKET).download(`${userId}/avatar`);
      if (error && !missing(error)) throw error;
      return error ? null : data;
    },
    async remove(userId) {
      try {
        const { error } = await client.storage.from(BUCKET).remove([`${userId}/avatar`]);
        if (error && !missing(error)) throw error;
        return { success: true };
      } catch (error) { return { error: error.message || 'Falha ao remover foto' }; }
    }
  };
}
module.exports = { createAvatarStorage };
