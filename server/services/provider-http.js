async function fetchJsonWithTimeout(url, timeoutMs = 12000, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LinguaFire/1.0',
      ...extraHeaders
    },
    signal: AbortSignal.timeout(timeoutMs)
  });

  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch (_error) {
    data = { raw: body };
  }

  return { response, data };
}

async function fetchTextWithTimeout(url, options = {}, timeoutMs = 12000) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch (_error) {
    data = { raw: body };
  }
  return { response, data };
}

module.exports = { fetchJsonWithTimeout, fetchTextWithTimeout };
