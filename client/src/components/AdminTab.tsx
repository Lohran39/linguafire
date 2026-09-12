import { CuratorPanel } from './CuratorPanel';
import { ProductUsagePanel } from './ProductUsagePanel';
import { FormEvent, useEffect, useState } from 'react';
import { getAdminSummary, saveCuratedNativeVideos, getProductUsageSummary, type ProductUsageSummary, type AdminUserRow, type AdminSummary } from '../services/admin';
import { getContentReports, reportReasons, type ContentReport } from '../services/curation';
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
  const [section, setSection] = useState('overview');
  const [contentVisited, setContentVisited] = useState(false);
  const [usage, setUsage] = useState<ProductUsageSummary | null>(null);
  const [usageError, setUsageError] = useState('');
  const [reports, setReports] = useState<ContentReport[] | null>(null);
  const [reportsError, setReportsError] = useState('');
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
    setIsLoading(true);
    setError(''); setUsageError(''); setReportsError('');
    const results = await Promise.allSettled([getAdminSummary(), getProductUsageSummary(), getContentReports()]);
    const [accounts, activity, pending] = results;
    if (accounts.status === 'fulfilled') setSummary(accounts.value);
    else setError('Não foi possível atualizar os alunos. Tente novamente.');
    if (activity.status === 'fulfilled') setUsage(activity.value);
    else setUsageError('Não foi possível atualizar os indicadores de uso. Tente novamente.');
    if (pending.status === 'fulfilled') setReports(pending.value);
    else setReportsError('Não foi possível atualizar as denúncias. Tente novamente.');
    setIsLoading(false);
  }

  function navigate(next: string) {
    if (next === 'content') setContentVisited(true);
    setSection(next);
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

  const retention = usage?.retention.find(item => item.day === 7);
  const sections = [ ['overview', 'Visão geral'], ['students', 'Alunos'], ['content', 'Conteúdos'], ['usage', 'Uso e retorno'] ];
  function studentList(users: AdminUserRow[]) {
    return <div className="admin-students">{users.length ? users.map(user => <details key={user.id} className="admin-student">
      <summary><strong>{user.name || 'Estudante'}</strong><small>{user.placement_completed ? user.english_level || 'Nível não informado' : 'Sem nivelamento'} · {user.xp ?? 0} XP</small></summary>
      <dl><div><dt>Email</dt><dd>{maskEmail(user.email)}</dd></div><div><dt>Cadastro</dt><dd>{formatDate(user.created_at)}</dd></div>
        <div><dt>Email confirmado</dt><dd>{user.email_verified ? 'Sim' : 'Não'}</dd></div><div><dt>Nível de gamificação</dt><dd>{user.level ?? 1}</dd></div></dl>
    </details>) : <p>Nenhum cadastro disponível.</p>}</div>;
  }

  return <section className="admin-layout admin-workspace" aria-label="Painel admin">
    <header className="admin-hero"><div><span className="section-kicker">Admin</span><h1>Painel do LinguaFire</h1><p>Alunos, conteúdos e acompanhamento em um só lugar.</p></div>
      {section !== 'content' && <button className="secondary-button" onClick={() => void loadSummary()} disabled={isLoading}>{isLoading ? 'Atualizando…' : 'Atualizar painel'}</button>}
    </header>
    <div className="admin-shell">
      <nav className="admin-navigation" aria-label="Seções do Admin">{sections.map(([key, label]) => <button key={key} type="button" aria-current={section === key ? 'page' : undefined} aria-controls={`admin-${key}`} onClick={() => navigate(key)}>{label}</button>)}</nav>
      <div className="admin-content">
        {error && <p className="form-error" role="status">{error}</p>}
        {usageError && section !== 'content' && <p className="form-error" role="status">{usageError}</p>}
        <div id="admin-overview" hidden={section !== 'overview'}>
          <h2>Visão geral</h2>
          <div className="admin-metrics">{[
            [summary?.stats.totalUsers ?? '—', 'Contas cadastradas'], [usage?.activeToday ?? '—', 'Alunos ativos hoje'],
            [usage?.active28Days ?? '—', 'Ativos em 28 dias'], [retention?.eligible ? `${Math.round(100 * retention.returned / retention.eligible)}%` : '—', 'Retorno após 7 dias']
          ].map(([value, label]) => <article key={label}><span>{value}</span><strong>{label}</strong></article>)}</div>
          <p className="admin-note">Ativos são alunos que acessaram uma aba. Datas em UTC. Retorno sem amostra aparece como “—”.</p>
          <div className="admin-grid">
            <section className="admin-panel"><h3>Precisam de atenção</h3>
              {reportsError ? <p role="status">{reportsError}</p> : reports === null ? <p>Carregando denúncias…</p> : reports.length ? <>
                <p className="admin-pending">{reports.length === 100 ? '100 ou mais denúncias pendentes' : `${reports.length} denúncia(s) pendente(s)`}</p>
                <ul className="admin-pending-list">{reports.slice(0, 3).map(item => <li key={item.id}><strong>{item.title}</strong><small>{reportReasons[item.reason as keyof typeof reportReasons] || item.reason}</small></li>)}</ul>
              </> : <p>Nenhuma denúncia pendente.</p>}
              <button className="secondary-button" onClick={() => navigate('content')}>Revisar conteúdos</button>
            </section>
            <section className="admin-panel"><h3>Cadastros recentes</h3>{summary ? studentList(summary.recentUsers.slice(0, 3)) : <p>{isLoading ? 'Carregando alunos…' : 'Dados indisponíveis.'}</p>}<button className="secondary-button" onClick={() => navigate('students')}>Ver alunos</button></section>
          </div>
        </div>
        <div id="admin-students" hidden={section !== 'students'}><h2>Alunos</h2>
          <p className="admin-note">Até 8 cadastros recentes e os 10 primeiros no ranking. Esta é uma seleção de contas.</p>
          {summary && <><details className="admin-panel"><summary>Detalhes dos cadastros</summary><p>{summary.stats.verifiedUsers} emails confirmados · {summary.stats.googleUsers} contas Google · {summary.stats.passwordUsers} contas por email e senha</p></details>
            <section className="admin-panel"><h3>Cadastros recentes</h3>{studentList(summary.recentUsers)}</section>
            <details className="admin-panel"><summary>Ranking de XP · até 10 alunos</summary>{studentList(summary.topUsers)}</details></>}
        </div>
        <div id="admin-content" hidden={section !== 'content'}><h2>Conteúdos</h2>
          {contentVisited && <CuratorPanel onReportsChange={setReports} />}
          <details className="admin-panel"><summary>Configurar sugestões de Nativos</summary><p>Associe vídeos a uma expressão. A verificação do conteúdo é feita na ficha de revisão.</p>
              <form className="admin-curated-form" onSubmit={handleCuratedSubmit}>
                <input
                  className="field"
                  aria-label="Expressão para os vídeos"
                  placeholder="Expressão: look forward to"
                  value={curatedQuery}
                  onChange={(event) => setCuratedQuery(event.target.value)}
                />
                <select aria-label="Idioma dos vídeos" value={curatedLang} onChange={(event) => setCuratedLang(event.target.value)}>
                  {nativeLanguages.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <textarea aria-label="Links ou IDs dos vídeos"
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
          </details>
        </div>
        <div id="admin-usage" hidden={section !== 'usage'}><ProductUsagePanel data={usage} loading={isLoading} /></div>
      </div>
    </div>
  </section>;
}
