// Auth utilities - cookie handling for HttpOnly JWT

function getCookieToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/(?:^|;\s*)linguafire_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=604800'
  ];

  if (isProd || process.env.BASE_URL?.startsWith('https://')) {
    cookieOptions.push('Secure');
  }

  res.setHeader('Set-Cookie', `linguafire_token=${encodeURIComponent(token)}; ${cookieOptions.join('; ')}`);
}

function clearAuthCookie(res) {
  const cookieOptions = [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0'
  ];

  if (process.env.NODE_ENV === 'production' || process.env.BASE_URL?.startsWith('https://')) {
    cookieOptions.push('Secure');
  }

  res.setHeader('Set-Cookie', `linguafire_token=; ${cookieOptions.join('; ')}`);
}

module.exports = {
  getCookieToken,
  setAuthCookie,
  clearAuthCookie
};
