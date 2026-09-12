export function LivesIndicator({ lives }: { lives?: number }) {
  const balance = Math.max(0, Math.min(10, lives ?? 10));
  const label = balance === 10 ? 'Vidas cheias' : balance === 0 ? 'Sem vidas para desafios' : balance === 1 ? 'Última vida' : balance <= 3 ? 'Poucas vidas' : 'Vidas disponíveis';
  return <div className={`lives-indicator${balance <= 3 ? ' lives-low' : ''}`} role="status" aria-live="polite" aria-atomic="true">
    <span aria-hidden="true">{balance ? '❤️' : '♡'}</span><strong>{balance}/10</strong><span>{label}</span>
  </div>;
}
