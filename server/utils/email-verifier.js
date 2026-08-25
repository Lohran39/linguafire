const dns = require('dns').promises;

function getEmailDomain(email = '') {
  const atIndex = String(email).lastIndexOf('@');
  if (atIndex === -1) return '';
  return String(email).slice(atIndex + 1).trim().toLowerCase();
}

async function verifyEmailCanReceiveMail(email) {
  const domain = getEmailDomain(email);
  if (!domain || domain.length > 253) return false;

  try {
    const records = await dns.resolveMx(domain);
    return records.some(record => record && record.exchange);
  } catch (error) {
    if (error && ['ENODATA', 'ENOTFOUND', 'ENOTIMP', 'EINVAL'].includes(error.code)) {
      return false;
    }
    throw error;
  }
}

module.exports = {
  getEmailDomain,
  verifyEmailCanReceiveMail
};
