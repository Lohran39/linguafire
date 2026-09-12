import { useEffect, useRef, useState } from 'react';
import { getContentReports, getCurations, reportReasons, reviewContent, type ContentIdentity, type ContentReport, type CurationItem } from '../services/curation';
import { nativeLanguages } from '../services/natives';
const emptyContent: ContentIdentity = { kind: 'music', title: '', artist: '', lang: 'english', videoId: '' };
export function CuratorPanel({ onReportsChange }: { onReportsChange?: (reports: ContentReport[]) => void }) {
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const reviewRef = useRef<HTMLDetailsElement>(null);
  function openReview() {
    if (reviewRef.current) {
      reviewRef.current.open = true;
      reviewRef.current.scrollIntoView({ block: 'start' });
      reviewRef.current.querySelector('input')?.focus({ preventScroll: true });
    }
  }
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [catalog, setCatalog] = useState<CurationItem[]>([]);
  const [content, setContent] = useState<ContentIdentity>(emptyContent);
  const [videoMatches, setVideoMatches] = useState(false);
  const [textMatches, setTextMatches] = useState(false);
  const [translation, setTranslation] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true); setLoadError('');
    try {
      const [pending, music, native] = await Promise.all([getContentReports(), getCurations('music'), getCurations('native')]);
      setReports(pending); onReportsChange?.(pending); setCatalog([...music, ...native]);
    } catch (error) { setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function select(item: ContentReport | CurationItem) {
    setContent({ kind: item.kind, title: item.title, artist: item.artist, lang: item.lang, videoId: item.video_id });
    setVideoMatches(false); setTextMatches(false); setTranslation(''); setNotes(''); setMessage('');
    openReview();
  }
  async function save(status: 'verified' | 'rejected') {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      await reviewContent(content, { status, videoMatches, textMatches, translation, notes });
      setMessage(status === 'verified' ? 'Conteúdo verificado. Sugestões atualizadas.' : 'Conteúdo reprovado e removido das sugestões.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao salvar revisão.'); }
    finally { setBusy(false); }
  }
  return <section className="curator-panel" aria-labelledby="curator-heading">
    <h2 id="curator-heading">Revisão de músicas e Nativos</h2>
    <p>Confira o vídeo e o texto na atividade antes de aprovar. A reprodução do vídeo, por si só, não confirma a correspondência.</p>
    <button type="button" className="secondary-button" disabled={loading || busy} onClick={() => void load()}>Atualizar fila</button>
    {loadError && <p role="status" className="form-error">{loadError}</p>}
    <label className="admin-content-filter">Mostrar<select value={kindFilter} onChange={event => setKindFilter(event.target.value)}><option value="all">Músicas e Nativos</option><option value="music">Músicas</option><option value="native">Nativos</option></select></label>
    <h3>Denúncias pendentes</h3>
    <p>Até 100 denúncias, começando pelas mais antigas.</p>
    {loading ? <p>Carregando fila…</p> : loadError && !reports.length ? <p>Fila indisponível. Atualize para tentar novamente.</p> : reports.filter(item => kindFilter === 'all' || item.kind === kindFilter).length ? <ul className="curation-queue">{reports.filter(item => kindFilter === 'all' || item.kind === kindFilter).map(report => <li key={report.id}>
      <strong>{report.title} {report.artist && `· ${report.artist}`}</strong>
      <p>{reportReasons[report.reason as keyof typeof reportReasons] || report.reason}</p>
      {report.detail && <p>{report.detail}</p>}
      <button type="button" onClick={() => select(report)}>Revisar este conteúdo</button>
    </li>)}</ul> : <p>Nenhuma denúncia pendente carregada.</p>}
    <details ref={reviewRef} className="admin-review-details"><summary>Ficha de revisão · revisar um conteúdo</summary>
    <form onSubmit={event => { event.preventDefault(); void save('verified'); }}>
      <fieldset disabled={busy}>
        <legend>Ficha de revisão</legend>
        <label>Tipo<select value={content.kind} onChange={event => { setContent({ ...emptyContent, kind: event.target.value as ContentIdentity['kind'] }); setVideoMatches(false); setTextMatches(false); setTranslation(''); }}><option value="music">Música</option><option value="native">Nativos</option></select></label>
        <label>{content.kind === 'music' ? 'Título da música' : 'Expressão pesquisada'}<input required maxLength={160} value={content.title} onChange={event => { setContent({ ...content, title: event.target.value }); setVideoMatches(false); setTextMatches(false); }} /></label>
        {content.kind === 'music' ? <label>Artista<input required maxLength={120} value={content.artist} onChange={event => { setContent({ ...content, artist: event.target.value }); setVideoMatches(false); setTextMatches(false); }} /></label> : <label>Idioma<select value={content.lang} onChange={event => { setContent({ ...content, lang: event.target.value }); setVideoMatches(false); setTextMatches(false); }}>{nativeLanguages.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        <label>ID do vídeo no YouTube<input required pattern="[a-zA-Z0-9_-]{11}" maxLength={11} value={content.videoId} onChange={event => { setContent({ ...content, videoId: event.target.value }); setVideoMatches(false); setTextMatches(false); }} /></label>
        {/^[a-zA-Z0-9_-]{11}$/.test(content.videoId) && <a href={`https://www.youtube.com/watch?v=${content.videoId}`} target="_blank" rel="noreferrer">Abrir vídeo para conferir</a>}
        <label className="review-check"><input type="checkbox" checked={videoMatches} onChange={event => setVideoMatches(event.target.checked)} />Assisti ao vídeo e confirmei a música ou expressão.</label>
        <label className="review-check"><input type="checkbox" checked={textMatches} onChange={event => setTextMatches(event.target.checked)} />Conferi a correspondência com a letra ou expressão exibida na atividade.</label>
        <label>Tradução em português<select required value={translation} onChange={event => setTranslation(event.target.value)}><option value="">Selecione após conferir</option><option value="available">Disponível e conferida</option><option value="partial">Parcial</option><option value="missing">Ausente</option></select></label>
        <label>Observações<textarea maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} /></label>
        <div className="curation-actions"><button type="submit" className="primary-button" disabled={!videoMatches || !textMatches || !translation}>Aprovar conteúdo</button><button type="button" className="secondary-button" disabled={!translation || !content.title || !content.videoId} onClick={() => void save('rejected')}>Reprovar conteúdo</button></div>
      </fieldset>
    </form>
    </details>
    {message && <p role="status">{message}</p>}
    <details><summary>Conteúdos revisados · {catalog.length}</summary><label>Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="verified">Verificados</option><option value="rejected">Reprovados</option></select></label><ul className="curation-queue">{catalog.filter(item => (kindFilter === 'all' || item.kind === kindFilter) && (statusFilter === 'all' || item.status === statusFilter)).map(item => <li key={`${item.kind}:${item.content_key}:${item.video_id}`}><strong>{item.title} · {item.status === 'verified' ? 'Aprovado' : 'Reprovado'}</strong><button type="button" onClick={() => select(item)}>Reavaliar</button></li>)}</ul></details>
  </section>;
}
