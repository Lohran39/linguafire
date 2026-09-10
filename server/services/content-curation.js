const normalizeContent = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
function contentKey({ kind, title, artist, lang }) {
  return kind === 'music' ? `${normalizeContent(title)}|${normalizeContent(artist)}` : `${normalizeContent(title)}|${normalizeContent(lang || 'english')}`;
}
function isVerified(item) { return item.status === 'verified' && item.video_matches && item.text_matches && !item.reports; }
function prioritizeVideos(ids, items) {
  const rejected = new Set(items.filter(item => item.status === 'rejected').map(item => item.video_id));
  const verified = items.filter(isVerified).map(item => item.video_id);
  return [...new Set([...verified, ...ids])].filter(id => !rejected.has(id));
}
function createContentCuration(supabase) {
  async function list(kind, key) {
    let query = supabase.from('content_curations').select('kind,content_key,video_id,title,artist,lang,status,video_matches,text_matches,translation,updated_at').eq('kind', kind);
    if (key) query = query.eq('content_key', key);
    async function readReports() {
      const rows = [];
      for (let offset = 0; ; offset += 1000) {
        let reportQuery = supabase.from('content_reports').select('content_key,video_id,created_at').eq('kind', kind).eq('status', 'open');
        if (key) reportQuery = reportQuery.eq('content_key', key);
        const result = await reportQuery.order('created_at').order('id').range(offset, offset + 999);
        if (result.error) throw new Error('Curadoria indisponível.');
        rows.push(...result.data);
        if (result.data.length < 1000) return { data: rows };
      }
    }
    const [curations, reports] = await Promise.all([query.order('updated_at', { ascending: false }).limit(1000), readReports()]);
    if (curations.error) throw new Error('Curadoria indisponível.');
    return curations.data.map(item => ({ ...item, reports: reports.data.filter(report => report.content_key === item.content_key && report.video_id === item.video_id && report.created_at > item.updated_at).length }));
  }
  return { list };
}
module.exports = { contentKey, normalizeContent, isVerified, prioritizeVideos, createContentCuration };
