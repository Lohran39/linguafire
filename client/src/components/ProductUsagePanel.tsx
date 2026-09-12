import type { ProductUsageSummary } from '../services/admin';
const names: Record<string, string> = { home: 'Início', lessons: 'Lições', music: 'Música', flashcard: 'Revisão', conversation: 'Conversar', natives: 'Nativos', shop: 'Loja', placement: 'Nível', profile: 'Perfil' };
export function ProductUsagePanel({ data, loading }: { data: ProductUsageSummary | null; loading: boolean }) {
  return <section aria-label="Retenção e uso">
    <h2>Uso e retorno</h2>
    <p className="admin-note">Acesso às abas, não conclusão de exercícios nem satisfação.</p>
    {!data && <p>{loading ? 'Carregando indicadores…' : 'Indicadores indisponíveis.'}</p>}
    {data && <>
      <div className="admin-grid">{[1, 7].map(day => {
        const item = data.retention.find(r => r.day === day);
        return <article className="admin-panel" key={day}><h3>Retorno após {day} {day === 1 ? 'dia' : 'dias'}</h3>{item?.eligible
          ? <><strong className="admin-retention-value">{Math.round(100 * item.returned / item.eligible)}%</strong><p>{item.returned} de {item.eligible} alunos voltaram.</p></>
          : <p>Aguardando tempo suficiente de acompanhamento.</p>}</article>;
      })}</div>
      <section className="admin-panel"><h3>Abas acessadas · últimos 28 dias</h3>
        {data.features.length ? <ul className="admin-feature-list">{[...data.features].sort((a, b) => b.users - a.users).map(item => <li key={item.feature}>
          <strong>{names[item.feature] || item.feature}</strong><span>{item.users} alunos</span><small>{item.activeDays} dias de uso somados</small>
        </li>)}</ul> : <p>Ainda não há uso registrado de alunos.</p>}
      </section>
      <details className="admin-panel"><summary>Como os indicadores são calculados</summary><p>Retorno no dia exato após o primeiro uso observado, com grupos dos últimos 90 dias. Datas em UTC; administradores não entram.</p><p>Cada aluno conta uma vez por aba por dia. Dias de uso somam esses registros entre os alunos.</p></details>
    </>}
  </section>;
}
