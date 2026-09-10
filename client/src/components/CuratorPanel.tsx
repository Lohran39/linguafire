import { useEffect, useState } from 'react';
import { getContentReports, getCurations, reportReasons, reviewContent, type ContentIdentity, type ContentReport, type CurationItem } from '../services/curation';
import { nativeLanguages } from '../services/natives';
const emptyContent: ContentIdentity = { kind: 'music', title: '', artist: '', lang: 'english', videoId: '' };
export function CuratorPanel() {
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
    try {
      const [pending, music, native] = await Promise.all([getContentReports(), getCurations('music'), getCurations('native')]);
      setReports(pending); setCatalog([...music, ...native]);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar.'); }
  }
  useEffect(() => { void load(); }, []);
  function select(item: ContentReport | CurationItem) {
    setContent({ kind: item.kind, title: item.title, artist: item.artist, lang: item.lang, videoId: item.video_id });
    setVideoMatches(false); setTextMatches(false); setTranslation(''); setNotes(''); setMessage('');
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
    <button type="button" className="secondary-button" onClick={() => void load()}>Atualizar fila</button>
    <h3>Denúncias pendentes · {reports.length}</h3>
    <p>Até 100 denúncias, começando pelas mais antigas.</p>
    {reports.length ? <ul className="curation-queue">{reports.map(report => <li key={report.id}>
      <strong>{report.title} {report.artist && `· ${report.artist}`}</strong>
      <p>{reportReasons[report.reason as keyof typeof reportReasons] || report.reason}</p>
      {report.detail && <p>{report.detail}</p>}
      <button type="button" onClick={() => select(report)}>Revisar este conteúdo</button>
    </li>)}</ul> : <p>Nenhuma denúncia pendente carregada.</p>}
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
    {message && <p role="status">{message}</p>}
    <details><summary>Conteúdos revisados · {catalog.length}</summary><ul className="curation-queue">{catalog.map(item => <li key={`${item.kind}:${item.content_key}:${item.video_id}`}><strong>{item.title} · {item.status === 'verified' ? 'Aprovado' : 'Reprovado'}</strong><button type="button" onClick={() => select(item)}>Reavaliar</button></li>)}</ul></details>
  </section>;
}
