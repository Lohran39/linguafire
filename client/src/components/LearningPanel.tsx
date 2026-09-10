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
    <h2 id="learning-heading">Seu aprendizado além do XP</h2>
    <p>Resultados dos exercícios. O nível de inglês vem do nivelamento; o XP mede sua participação.</p>
    {loading && <p role="status">Carregando seu aprendizado…</p>}
    {error && <p role="alert">{error}</p>}
    {(error || pending > 0) && <button type="button" className="secondary-button" onClick={() => setRetry(value => value + 1)}>Atualizar indicadores</button>}
    {pending > 0 && <p role="status">{pending} resultado(s) aguardam sincronização neste dispositivo.</p>}
    {data && !loading && <>
      <div className="learning-word-count"><strong>{data.consolidatedWords}</strong><span>palavras consolidadas de {data.reviewedWords} revisadas</span></div>
      <small>Critério: ao menos 3 revisões bem avaliadas e intervalo de revisão de 7 dias ou mais. Baseado na sua autoavaliação nos flashcards.</small>
      {data.words.length > 0 && <ul className="learned-words">{data.words.map(item => <li key={item.word}>{item.word} <span>· {item.translation}</span></li>)}</ul>}
      <h3>Prática por habilidade</h3>
      <p>Últimos 14 dias comparados aos 14 anteriores. A variação aparece com pelo menos 5 respostas em cada período.</p>
      <div className="skill-evidence-grid">{data.skills.map(skill => <article key={skill.activity}>
        <h4>{skill.label}</h4>
        <strong>{skill.score === null ? 'Sem dados' : `${skill.score}%`}</strong>
        {skill.score !== null && <meter min={0} max={100} value={skill.score} aria-label={`${skill.label}: ${skill.score}%`} />}
        <p>{skill.attempts} resposta(s) nos últimos 14 dias</p>
        <small>{skill.change === null ? 'Sem comparação neste período.' : `${skill.change > 0 ? '+' : ''}${skill.change} pontos percentuais em relação ao período anterior.`}</small>
      </article>)}</div>
      <small>Vocabulário usa sua avaliação dos cartões. Escrita usa a avaliação da IA. Os demais percentuais vêm das respostas aos exercícios. Estes indicadores não certificam proficiência.</small>
      <h3>Erros recorrentes</h3>
      {data.recurringErrors.length ? <ul className="recurring-errors">{data.recurringErrors.map(item => <li key={item.type}>
        <strong>{item.type} · {item.count} registros</strong>
        {item.examples.map(example => <p key={example.incorrect}><span>{example.incorrect}</span> → <b>{example.correct}</b></p>)}
      </li>)}</ul> : <p>Nenhum padrão recorrente identificado nas análises salvas.</p>}
      <small>A evolução por habilidade começa com os exercícios registrados nesta versão. Palavras e erros aproveitam seu histórico existente.</small>
    </>}
  </section>;
}
