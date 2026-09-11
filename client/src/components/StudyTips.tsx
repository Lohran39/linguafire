import { useRef, useState } from 'react';
import { normalizeEnglishLevel, type EnglishLevel } from '../data/levels';

const tips: Record<EnglishLevel, [string, string, string]> = {
  A1: ['Monte três frases sobre você: nome, cidade e algo de que gosta.', 'Pratique um pedido curto, como “Can I have water, please?”. Depois troque a bebida.', 'Ouça uma frase curta com a letra, pause e repita devagar.'],
  A2: ['Conte sua rotina em três frases e acrescente o que fez ontem.', 'Simule uma viagem: peça informações e faça uma pergunta de continuação.', 'Ouça um trecho curto e identifique quem fala, onde está e o que quer.'],
  B1: ['Conte uma experiência e explique por que ela foi importante para você.', 'Dê sua opinião e acrescente um motivo e um exemplo, sem preparar tudo em português.', 'Ouça um trecho sem ler. Depois confira a letra e resuma a ideia principal.'],
  B2: ['Explique uma decisão de trabalho com duas razões e uma possível desvantagem.', 'Defenda uma opinião e depois experimente argumentar pelo ponto de vista contrário.', 'Escute um trecho natural e observe como o falante liga palavras e destaca ideias.'],
  C1: ['Reescreva uma ideia em dois registros: conversa informal e mensagem profissional.', 'Apresente um argumento com ressalvas. Use exemplos para explicar as nuances.', 'Ouça um trecho e observe ironia, intenção e escolhas de palavras. Explique sua interpretação.']
};

const extraTips: Record<EnglishLevel, [string, string, string, string]> = {
  A1: ['Repita uma apresentação curta: “My name is…”. Troque o nome e diga novamente.', 'Escreva três frases com “I like” sobre coisas de que você gosta.', 'Antes de virar o cartão, diga a palavra e uma frase curta com ela.', 'Leia uma frase simples e encontre quem faz a ação e o que acontece.'],
  A2: ['Treine perguntas de viagem em voz alta, como “Where is the station?”.', 'Escreva uma mensagem curta combinando um horário e um lugar.', 'Transforme uma palavra revisada em uma pergunta e uma resposta.', 'Leia um diálogo curto e procure horários, lugares e pedidos.'],
  B1: ['Repita uma frase em blocos de sentido, sem pausar depois de cada palavra.', 'Conte uma experiência em cinco frases: começo, acontecimento e resultado.', 'Revise uma expressão e use-a para contar algo que aconteceu com você.', 'Leia um parágrafo e resuma a ideia em uma frase com suas palavras.'],
  B2: ['Diga a mesma frase destacando palavras diferentes e observe a mudança de sentido.', 'Escreva um e-mail curto com objetivo, contexto e próximo passo.', 'Compare duas palavras parecidas e crie um exemplo adequado para cada uma.', 'Leia uma opinião e separe o argumento dos exemplos que o sustentam.'],
  C1: ['Repita um trecho observando ritmo e ênfase; priorize clareza, sem forçar um sotaque.', 'Revise um parágrafo retirando repetições e ajustando o tom ao leitor.', 'Compare expressões próximas e explique quando cada uma soaria mais natural.', 'Leia um trecho e identifique o que o autor sugere sem dizer diretamente.']
};

export function StudyTips({ level, assessed }: { level: string; assessed: boolean }) {
  const englishLevel = normalizeEnglishLevel(level);
  const [page, setPage] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const extra = extraTips[assessed ? englishLevel : 'A1'];
  const specific = assessed ? tips[englishLevel] : [
    'Faça o teste na aba Nível para receber dicas adequadas ao seu ponto de partida.',
    'Comece com frases curtas sobre sua rotina e assuntos familiares.',
    'Escolha um trecho curto de música, acompanhe a letra e repita em voz alta.'
  ];
  const slides = [
    { title: 'Sua rotina de estudo', items: [specific[0], 'Reserve 10 minutos: faça uma lição e revise algumas palavras.', 'Volte amanhã e tente lembrar antes de consultar a resposta.'] },
    { title: 'Hora de conversar', items: [specific[1], 'Após uma correção, tente usar a mesma estrutura em uma frase nova.', 'Se a explicação parecer estranha, confira com um professor ou uma fonte de confiança.'] },
    { title: 'Escute e amplie seu vocabulário', items: [specific[2], 'Escolha até três expressões úteis e crie um exemplo seu para cada uma.', 'Revise as expressões em outro dia e tente usá-las em uma conversa.'] },
    { title: 'Fale com mais clareza', items: [extra[0], 'Ouça primeiro, pause e repita. Compare um detalhe de cada vez.', 'Se quiser, grave sua voz no celular para perceber o que pode melhorar.'] },
    { title: 'Escreva um pouco', items: [extra[1], 'Leia o que escreveu em voz alta e procure trechos difíceis de entender.', 'Depois de revisar, reescreva uma frase sem olhar a versão anterior.'] },
    { title: 'Revise para usar', items: [extra[2], 'Tente lembrar antes de revelar a resposta e avalie sua lembrança com sinceridade.', 'Se errar, consulte a resposta e tente de novo mais tarde.'] },
    { title: 'Leia pelo sentido', items: [extra[3], 'Tente entender a ideia geral antes de procurar cada palavra desconhecida.', 'Anote uma expressão que você gostaria de usar em outra situação.'] },
    { title: 'Nos dias mais difíceis', items: ['Escolha uma tarefa pequena: revisar três palavras ou dizer duas frases.', 'Se o exercício estiver difícil demais, volte a um exemplo mais simples.', 'Na próxima sessão, retome uma dúvida por vez. Não precisa resolver tudo hoje.'] }
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
