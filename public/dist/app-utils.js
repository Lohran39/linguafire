function $(id) {
  return document.getElementById(id);
}

function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function createEl(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}

function stripHtml(value = '') {
  const tmp = document.createElement('div');
  tmp.innerHTML = String(value);
  return tmp.textContent || tmp.innerText || '';
}

function normalizeSongText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/official video|official music video|official lyric video|lyrics video|lyric video|audio|video oficial|letra|legendado|tradu[cç][aã]o|feat\.?|ft\.?/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractYouTubeId(url) {
  if (!url) return null;

  const cleaned = String(url).trim();
  const directId = cleaned.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directId) return directId[0];

  try {
    const parsed = new URL(cleaned);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0]?.slice(0, 11) || null;
    if (host.endsWith('youtube.com') || host.endsWith('music.youtube.com')) {
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v').slice(0, 11);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((part) => ['embed', 'shorts', 'live', 'watch'].includes(part));
      if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].slice(0, 11);
    }
  } catch (_error) {}

  const fallback = cleaned.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  return fallback ? fallback[1] : null;
}
