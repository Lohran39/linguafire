import { FormEvent, useState } from 'react';
import { getAdminSummary, type AdminSummary } from '../services/admin';

const ADMIN_TOKEN_KEY = 'linguafire_admin_token';

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

export function AdminTab() {
  const [token, setToken] = useState(() => sessionStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function loadSummary(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Digite o token admin.');
      return;
    }

    try {
      setIsLoading(true);
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
      setSummary(await getAdminSummary(token.trim()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar painel admin.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="admin-layout" aria-label="Painel admin">
      <div className="admin-hero">
        <span className="section-kicker">Admin</span>
        <h1>Painel do LinguaFire</h1>
        <p className="lead">Acompanhe usuários reais, ranking e estado de entrada na plataforma.</p>

        <form className="admin-token-row" onSubmit={loadSummary}>
          <input
            className="field"
            type="password"
            placeholder="Token admin"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? 'Carregando...' : 'Carregar painel'}
          </button>
        </form>
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
