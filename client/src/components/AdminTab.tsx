import { FormEvent, useEffect, useState } from 'react';
import { getAdminSummary, saveCuratedNativeVideos, type AdminSummary } from '../services/admin';
import { nativeLanguages } from '../services/natives';

function maskEmail(email = '') {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email || '-';
  return `${name.slice(0, 2)}***@${domain}`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function extractYouTubeVideoIds(value: string) {
  const matches = value.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)?([a-zA-Z0-9_-]{11})/g) || [];
  return [...new Set(matches
    .map((match) => match.replace(/^(v=|youtu\.be\/|embed\/|shorts\/)/, ''))
    .filter((item) => /^[a-zA-Z0-9_-]{11}$/.test(item)))];
}

export function AdminTab() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [curatedQuery, setCuratedQuery] = useState('');
  const [curatedLang, setCuratedLang] = useState('english');
  const [curatedVideoIds, setCuratedVideoIds] = useState('');
  const [curatedMessage, setCuratedMessage] = useState('');
  const [isSavingCurated, setIsSavingCurated] = useState(false);
  const previewVideoIds = extractYouTubeVideoIds(curatedVideoIds);

  async function loadSummary() {
    setError('');

    try {
      setIsLoading(true);
      setSummary(await getAdminSummary());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar painel admin.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  async function handleCuratedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ids = extractYouTubeVideoIds(curatedVideoIds);

    if (!curatedQuery.trim() || ids.length === 0 || isSavingCurated) return;

    try {
      setIsSavingCurated(true);
      setCuratedMessage('');
      const saved = await saveCuratedNativeVideos({
        query: curatedQuery.trim(),
        lang: curatedLang,
        videoIds: ids
      });
      setCuratedMessage(`Curadoria salva: ${saved.videoIds.length} video(s).`);
      setCuratedVideoIds(saved.videoIds.join('\n'));
    } catch (saveError) {
      setCuratedMessage(saveError instanceof Error ? saveError.message : 'Erro ao salvar curadoria.');
    } finally {
      setIsSavingCurated(false);
    }
  }

  return (
    <section className="admin-layout" aria-label="Painel admin">
      <div className="admin-hero">
        <span className="section-kicker">Admin</span>
        <h1>Painel do LinguaFire</h1>
        <p className="lead">Acompanhe usuários reais, ranking e estado de entrada na plataforma.</p>

        <button className="primary-button" type="button" onClick={loadSummary} disabled={isLoading}>
          {isLoading ? 'Carregando...' : 'Atualizar painel'}
        </button>
        {error && <div className="form-error">{error}</div>}
      </div>

      {summary && (
        <>
          <div className="admin-metrics">
            <article>
              <span>{summary.stats.totalUsers}</span>
              <strong>Usuários</strong>
            </article>
            <article>
              <span>{summary.stats.verifiedUsers}</span>
              <strong>Email confirmado</strong>
            </article>
            <article>
              <span>{summary.stats.googleUsers}</span>
              <strong>Google</strong>
            </article>
            <article>
              <span>{summary.stats.passwordUsers}</span>
              <strong>Email e senha</strong>
            </article>
          </div>

          <div className="admin-grid">
            <section className="admin-panel">
              <div className="panel-heading">
                <h2>Curadoria Nativos</h2>
                <span>YouTube</span>
              </div>
              <form className="admin-curated-form" onSubmit={handleCuratedSubmit}>
                <input
                  className="field"
                  placeholder="Expressão: look forward to"
                  value={curatedQuery}
                  onChange={(event) => setCuratedQuery(event.target.value)}
                />
                <select value={curatedLang} onChange={(event) => setCuratedLang(event.target.value)}>
                  {nativeLanguages.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Cole links do YouTube, Shorts ou IDs dos vídeos"
                  value={curatedVideoIds}
                  onChange={(event) => setCuratedVideoIds(event.target.value)}
                />
                {previewVideoIds.length > 0 && (
                  <div className="admin-video-preview">
                    {previewVideoIds.slice(0, 6).map((id) => (
                      <img alt="" key={id} src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} />
                    ))}
                  </div>
                )}
                <button className="primary-button" disabled={isSavingCurated || !curatedQuery.trim() || previewVideoIds.length === 0} type="submit">
                  {isSavingCurated ? 'Salvando...' : 'Salvar vídeos curados'}
                </button>
                {curatedMessage && <div className={curatedMessage.includes('Erro') || curatedMessage.includes('Acesso') ? 'form-error' : 'form-success'}>{curatedMessage}</div>}
              </form>
            </section>

            <section className="admin-panel">
              <div className="panel-heading">
                <h2>Top XP</h2>
                <span>{summary.topUsers.length}</span>
              </div>
              <div className="admin-table">
                {summary.topUsers.map((user, index) => (
                  <div className="admin-row" key={user.id}>
                    <span>{index + 1}</span>
                    <strong>{user.name || 'Estudante'}</strong>
                    <small>{user.english_level || 'A1'} · {user.xp || 0} XP</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-panel">
              <div className="panel-heading">
                <h2>Cadastros recentes</h2>
                <span>{summary.recentUsers.length}</span>
              </div>
              <div className="admin-table">
                {summary.recentUsers.map((user) => (
                  <div className="admin-row" key={user.id}>
                    <span>{user.email_verified ? 'OK' : '!'}</span>
                    <strong>{user.name || 'Estudante'}</strong>
                    <small>
                      {maskEmail(user.email)} · {user.placement_completed ? 'nivelado' : 'sem nível'} · {formatDate(user.created_at)}
                    </small>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
