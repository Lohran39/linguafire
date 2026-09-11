import { useEffect, useState } from 'react';
import { flushLearningEvents, getLearningSummary, pendingLearningEvents, type LearningSummary } from '../services/learning';
export function LearningPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<LearningSummary | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    async function load() {
      await flushLearningEvents(userId);
      try {
        const summary = await getLearningSummary();
        if (!cancelled) { setData(summary); setPending(pendingLearningEvents(userId)); }
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Indicadores indisponíveis.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId, retry]);
  return <section className="learning-evidence" aria-labelledby="learning-heading">
    <h2 id="learning-heading">Seu aprendizado</h2>
    <p>Seu progresso nos estudos, além do XP.</p>
    {loading && <p role="status">Carregando seu aprendizado…</p>}
    {error && <p role="alert">{error}</p>}
    {(error || pending > 0) && <button type="button" className="secondary-button" onClick={() => setRetry(value => value + 1)}>Atualizar indicadores</button>}
    {pending > 0 && <p role="status">{pending} resultado(s) aguardam sincronização neste dispositivo.</p>}
    {data && !loading && <>
      <div className="learning-word-count"><strong>{data.consolidatedWords}</strong><span>palavras consolidadas de {data.reviewedWords} revisadas</span></div>

      {data.words.length > 0 && <ul className="learned-words">{data.words.map(item => <li key={item.word}>{item.word} <span>· {item.translation}</span></li>)}</ul>}
      <h3>Últimos 14 dias</h3>
      {!data.skills.some(skill => skill.attempts > 0) && <p>Complete uma lição ou revisão para acompanhar sua evolução.</p>}
      <div className="skill-evidence-grid">{data.skills.filter(skill => skill.attempts > 0).map(skill => <article key={skill.activity}>
        <h4>{skill.label}</h4>
        <strong>{skill.score === null ? 'Sem dados' : `${skill.score}%`}</strong>
        {skill.score !== null && <meter min={0} max={100} value={skill.score} aria-label={`${skill.label}: ${skill.score}%`} />}
        <p>{skill.attempts} respostas</p>
        {skill.change !== null && <small>{skill.change > 0 ? '+' : ''}{skill.change} p.p. no período</small>}
      </article>)}</div>

      {data.recurringErrors.length > 0 && <h3>Para revisar</h3>}
      {data.recurringErrors.length ? <ul className="recurring-errors">{data.recurringErrors.map(item => <li key={item.type}>
        <strong>{item.type} · {item.count} registros</strong>
        {item.examples.map(example => <p key={example.incorrect}><span>{example.incorrect}</span> → <b>{example.correct}</b></p>)}
      </li>)}</ul> : null}
      <details className="learning-method">
        <summary>Como medimos</summary>
        <p>Palavras consolidadas: 3 revisões bem avaliadas e intervalo de pelo menos 7 dias, conforme sua autoavaliação.</p>
        <p>Comparamos os últimos 14 dias com os 14 anteriores, com pelo menos 5 respostas em cada período.</p>
        <p>Vocabulário usa sua autoavaliação; escrita, a avaliação da IA; demais habilidades, os acertos nos exercícios. O nível de inglês vem do nivelamento, e o XP mede participação.</p>
        <p>Estes indicadores não certificam proficiência. A evolução usa exercícios registrados nesta versão; palavras e erros incluem o histórico anterior.</p>
      </details>
    </>}
  </section>;
}
