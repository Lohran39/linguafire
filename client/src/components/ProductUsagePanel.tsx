import { useEffect, useState } from 'react';
type Summary = { activeToday: number; active28Days: number;
  retention: { day: number; eligible: number; returned: number }[];
  features: { feature: string; users: number; activeDays: number }[] };
const names: Record<string, string> = { home: 'Início', lessons: 'Lições', music: 'Música', flashcard: 'Revisão', conversation: 'Conversar', natives: 'Nativos', shop: 'Loja', placement: 'Nível', profile: 'Perfil' };
export function ProductUsagePanel() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  async function load() {
    setError('');
    try {
      const result = await fetch('/api/admin/product-usage', { credentials: 'include' });
      if (!result.ok) throw new Error();
      setData(await result.json());
    } catch { setError('Não foi possível carregar os indicadores. Tente novamente.'); }
  }
  useEffect(() => { void load(); }, []);
  return <section className="admin-panel" aria-label="Retenção e uso">
    <h2>Retorno dos alunos e uso</h2>
    <button type="button" onClick={load}>Atualizar indicadores</button>
    {error && <p role="status">{error}</p>}
    {data && <>
      <p>{data.activeToday} alunos ativos hoje · {data.active28Days} nos últimos 28 dias</p>
      <p>Retorno no dia exato após o primeiro uso observado. Datas em UTC; contas administradoras não entram.</p>
      {[1, 7].map(day => {
        const item = data.retention.find(r => r.day === day);
        return <p key={day}><strong>D{day}: </strong>{item?.eligible
          ? `${Math.round(100 * item.returned / item.eligible)}% (${item.returned}/${item.eligible} alunos)`
          : 'Aguardando alunos com tempo suficiente de acompanhamento'}</p>;
      })}
      <p>Coortes dos últimos 90 dias. Uso indica acesso à aba, não conclusão nem satisfação.</p>
      {data.features.length ? <ul>{data.features.map(item => <li key={item.feature}>
        {names[item.feature] || item.feature}: {item.users} alunos · {item.activeDays} dias de uso somados
      </li>)}</ul> : <p>Ainda não há uso registrado de alunos.</p>}
    </>}
  </section>;
}
