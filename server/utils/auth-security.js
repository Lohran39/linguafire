const crypto = require('crypto');

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const isVerified = (user) => Number(user?.email_verified) === 1;
const sessionIsCurrent = (claims, user) => Number(claims?.av || 0) === Number(user?.auth_version || 0);
const sessionClaims = (user) => ({ id: user.id, email: user.email, av: Number(user.auth_version || 0) });

module.exports = { hashToken, isVerified, sessionIsCurrent, sessionClaims };
