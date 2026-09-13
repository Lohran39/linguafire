import { useEffect, useState } from 'react';
type Row = { day:string; plan:string; model:string; requests:number; failures:number; input_tokens:number; output_tokens:number; thinking_tokens:number; cached_tokens:number; unknown_usage:number; estimated_usd:number; duration_ms:number };
export function AIUsagePanel() {
  const [rows,setRows]=useState<Row[] | null>(null), [error,setError]=useState(''), [loading,setLoading]=useState(false), [limited,setLimited]=useState(false);
  async function load() {
    setLoading(true); setError('');
    try {
      const result=await fetch('/api/admin/ai-usage',{credentials:'include',signal:AbortSignal.timeout(10000)});
      if (!result.ok) throw new Error('Não foi possível carregar o consumo. Confira a migração do banco.');
      const data=await result.json();setRows(data.rows);setLimited(data.limited);
    } catch(e) {setError(e instanceof Error ? e.message : 'Consumo indisponível.');}
    finally {setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  const grouped=Object.values((rows || []).reduce<Record<string,Row>>((out,row)=>{
    const key=`${row.plan}:${row.model}`;
    if (!out[key]) out[key]={...row,requests:0,failures:0,input_tokens:0,output_tokens:0,thinking_tokens:0,cached_tokens:0,unknown_usage:0,estimated_usd:0,duration_ms:0};
    for(const field of ['requests','failures','input_tokens','output_tokens','thinking_tokens','cached_tokens','unknown_usage','estimated_usd','duration_ms'] as const) out[key][field]+=Number(row[field] || 0);
    return out;
  },{}));
  const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:4}).format(value);
  return <section aria-label="Consumo e operação da IA"><h2>IA e operação</h2>
    <p className="admin-note">Últimos 30 dias, em UTC. Tentativas por plano e modelo, sem armazenar conversas.</p>
    <button className="secondary-button" disabled={loading} onClick={()=>void load()}>{loading?'Atualizando…':'Atualizar consumo'}</button>
    {error && <p className="form-error" role="status">{error}</p>}
    {limited && <p role="status">A consulta atingiu 1.000 registros; estes totais são parciais.</p>}
    {rows && !rows.length && <p>Ainda não há chamadas registradas nesta versão.</p>}
    <div className="admin-grid">{grouped.map(row=><article className="admin-panel admin-ai-card" key={`${row.plan}:${row.model}`}>
      <h3>{row.plan==='operation'?'Operação / avaliações internas':row.plan.toUpperCase()}</h3><p className="admin-note">{row.model}</p>
      <strong className="admin-retention-value">{money(row.estimated_usd)}</strong><p>Custo estimado das tentativas com consumo conhecido.</p>
      <p>{row.requests} tentativas · {row.failures} falhas ({row.requests?Math.round(100*row.failures/row.requests):0}%)</p>
      <p>Tempo médio: {row.requests?(row.duration_ms/row.requests/1000).toFixed(1):'0'} s</p>
      {row.unknown_usage>0 && <p className="admin-pending">{row.unknown_usage} tentativa(s) sem estimativa completa. O custo real pode ser maior.</p>}
      <details><summary>Detalhes dos tokens</summary><p>Entrada: {row.input_tokens.toLocaleString('pt-BR')} · já em cache: {row.cached_tokens.toLocaleString('pt-BR')}</p><p>Resposta: {row.output_tokens.toLocaleString('pt-BR')} · raciocínio: {row.thinking_tokens.toLocaleString('pt-BR')}</p></details>
    </article>)}</div>
    <p className="admin-note">Estimativa em dólar conforme o modelo e o preço na data da chamada; não é a fatura. Uma atividade pode gerar mais de uma tentativa. Confira os valores com o provedor. Falhas de telemetria ficam nos logs do servidor.</p>
  </section>;
}
