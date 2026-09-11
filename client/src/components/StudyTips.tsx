import { useRef, useState } from 'react';
import { normalizeEnglishLevel, type EnglishLevel } from '../data/levels';

const tips: Record<EnglishLevel, [string, string, string]> = {
  A1: ['Monte três frases sobre você: nome, cidade e algo de que gosta.', 'Pratique um pedido curto, como “Can I have water, please?”. Depois troque a bebida.', 'Ouça uma frase curta com a letra, pause e repita devagar.'],
  A2: ['Conte sua rotina em três frases e acrescente o que fez ontem.', 'Simule uma viagem: peça informações e faça uma pergunta de continuação.', 'Ouça um trecho curto e identifique quem fala, onde está e o que quer.'],
  B1: ['Conte uma experiência e explique por que ela foi importante para você.', 'Dê sua opinião e acrescente um motivo e um exemplo, sem preparar tudo em português.', 'Ouça um trecho sem ler. Depois confira a letra e resuma a ideia principal.'],
  B2: ['Explique uma decisão de trabalho com duas razões e uma possível desvantagem.', 'Defenda uma opinião e depois experimente argumentar pelo ponto de vista contrário.', 'Escute um trecho natural e observe como o falante liga palavras e destaca ideias.'],
  C1: ['Reescreva uma ideia em dois registros: conversa informal e mensagem profissional.', 'Apresente um argumento com ressalvas. Use exemplos para explicar as nuances.', 'Ouça um trecho e observe ironia, intenção e escolhas de palavras. Explique sua interpretação.']
};

export function StudyTips({ level, assessed }: { level: string; assessed: boolean }) {
  const englishLevel = normalizeEnglishLevel(level);
  const [page, setPage] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const specific = assessed ? tips[englishLevel] : [
    'Faça o teste na aba Nível para receber dicas adequadas ao seu ponto de partida.',
    'Comece com frases curtas sobre sua rotina e assuntos familiares.',
    'Escolha um trecho curto de música, acompanhe a letra e repita em voz alta.'
  ];
  const slides = [
    { title: 'Sua rotina de estudo', items: [specific[0], 'Reserve 10 minutos: faça uma lição e revise algumas palavras.', 'Volte amanhã e tente lembrar antes de consultar a resposta.'] },
    { title: 'Hora de conversar', items: [specific[1], 'Após uma correção, tente usar a mesma estrutura em uma frase nova.', 'Se a explicação parecer estranha, confira com um professor ou uma fonte de confiança.'] },
    { title: 'Escute e amplie seu vocabulário', items: [specific[2], 'Escolha até três expressões úteis e crie um exemplo seu para cada uma.', 'Revise as expressões em outro dia e tente usá-las em uma conversa.'] }
  ];
  function move(delta: number) { setPage(current => (current + delta + slides.length) % slides.length); }
  return <details className="study-tips" onToggle={() => { touchStart.current = null; }}>
    <summary>
      <span><strong>Por onde começar?</strong><small>Uma lição, uma revisão e uma conversa curta.</small></span>
      <span className="study-tips-toggle" aria-hidden="true">+</span>
    </summary>
    <section className="study-tips-carousel" aria-label="Dicas de estudo" aria-roledescription="carrossel">
      <div className="study-tips-slide" aria-live="polite" aria-atomic="true"
        onTouchStart={event => { const t = event.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; }}
        onTouchCancel={() => { touchStart.current = null; }}
        onTouchEnd={event => {
          const start = touchStart.current; touchStart.current = null;
          const end = event.changedTouches[0];
          if (!start || !end) return;
          const dx = end.clientX - start.x, dy = end.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
        }}>
        <h3>{slides[page].title} <small>{assessed ? `· Inglês ${englishLevel}` : '· Primeiros passos'}</small></h3>
        <ul>{slides[page].items.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
      <nav className="study-tips-controls" aria-label="Navegar pelas dicas">
        <button type="button" aria-label="Dicas anteriores" onClick={() => move(-1)}>←</button>
        <span>{page + 1} / {slides.length}</span>
        <button type="button" aria-label="Próximas dicas" onClick={() => move(1)}>→</button>
      </nav>
    </section>
  </details>;
}
