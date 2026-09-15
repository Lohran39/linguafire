const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function detectedAvatarType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function validateAvatar(buffer, contentType) {
  const declaredType = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_AVATAR_TYPES.has(declaredType)) return { error: 'Use uma imagem JPG, PNG ou WebP.' };
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return { error: 'Escolha uma imagem para enviar.' };
  if (buffer.length > 600 * 1024) return { error: 'A foto deve ter no máximo 600 KB após o ajuste.' };
  const detectedType = detectedAvatarType(buffer);
  if (!detectedType || detectedType !== declaredType) return { error: 'O arquivo enviado não é uma imagem válida.' };
  return { contentType: detectedType };
}

module.exports = { detectedAvatarType, validateAvatar };
