import { useState } from 'react';
import { isVerified, reportContent, reportReasons, type ContentIdentity, type CurationItem } from '../services/curation';
export function ContentReview({ content, item, translation, unavailable = false }: {
  content: ContentIdentity; item?: CurationItem; translation?: string; unavailable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('wrong_video');
  const [detail, setDetail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  return <section className="content-review" aria-label="Qualidade do conteúdo">
    <div className="curation-status">
      <strong>{sent || item?.reports ? 'Em revisão' : item?.status === 'rejected' ? 'Conteúdo reprovado' : isVerified(item) ? 'Conteúdo verificado' : unavailable ? 'Curadoria indisponível' : 'Ainda não verificado'}</strong>
      {translation && <span>{translation}</span>}
      {item && <small>Última revisão: {new Date(item.updated_at).toLocaleDateString('pt-BR')}</small>}
    </div>
    <button type="button" className="text-button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>Informar problema</button>
    {expanded && <form onSubmit={async event => {
      event.preventDefault(); if (sending) return;
      setSending(true); setMessage('');
      try { await reportContent(content, reason, detail); setSent(true); setMessage('Denúncia enviada para revisão. Obrigado por ajudar.'); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar.'); }
      finally { setSending(false); }
    }}>
      <label>Qual é o problema?<select value={reason} onChange={event => setReason(event.target.value)}>{Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Detalhes (opcional)<textarea maxLength={500} value={detail} onChange={event => setDetail(event.target.value)} placeholder="Ex.: a letra é de outra versão da música." /></label>
      <button type="submit" className="secondary-button" disabled={sending || sent}>{sending ? 'Enviando…' : 'Enviar denúncia'}</button>
      {message && <p role="status">{message}</p>}
    </form>}
  </section>;
}
