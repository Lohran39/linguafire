const { flashcardReviewSchema, validateBody } = require('../validation');

function setupFlashcardRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetFlashcards = async () => [],
    supabaseUpsertFlashcard = async () => ({ error: 'not configured' }),
    supabaseGetUserById = async () => null
  } = deps;

  const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const normalizeLevel = (level) => {
    const normalized = String(level || 'A1').toUpperCase();
    return levelOrder.includes(normalized) ? normalized : 'A1';
  };
  const levelDistance = (level, target) => Math.abs(levelOrder.indexOf(normalizeLevel(level)) - levelOrder.indexOf(normalizeLevel(target)));

  const FLASHCARD_VOCAB = [
    { word: 'water', translation: 'Água', level: 'A1', category: 'Rotina', example: 'I need water.' },
    { word: 'hungry', translation: 'Com fome', level: 'A1', category: 'Rotina', example: 'I am hungry.' },
    { word: 'tired', translation: 'Cansado', level: 'A1', category: 'Rotina', example: 'She is tired today.' },
    { word: 'morning', translation: 'Manhã', level: 'A1', category: 'Tempo', example: 'Good morning.' },
    { word: 'friend', translation: 'Amigo', level: 'A1', category: 'Pessoas', example: 'He is my friend.' },
    { word: 'family', translation: 'Família', level: 'A1', category: 'Pessoas', example: 'My family is here.' },
    { word: 'home', translation: 'Casa / lar', level: 'A1', category: 'Lugar', example: 'I am at home.' },
    { word: 'work', translation: 'Trabalho / trabalhar', level: 'A1', category: 'Rotina', example: 'I work every day.' },
    { word: 'learn', translation: 'Aprender', level: 'A1', category: 'Estudo', example: 'I learn English.' },
    { word: 'listen', translation: 'Ouvir / escutar', level: 'A1', category: 'Ação', example: 'Listen to the song.' },
    { word: 'travel', translation: 'Viajar / viagem', level: 'A2', category: 'Viagem', example: 'I love to travel.' },
    { word: 'luggage', translation: 'Bagagem', level: 'A2', category: 'Viagem', example: 'Where is my luggage?' },
    { word: 'receipt', translation: 'Recibo', level: 'A2', category: 'Compras', example: 'Can I have the receipt?' },
    { word: 'gorgeous', translation: 'Deslumbrante / lindo', level: 'A2', category: 'Descrição', example: 'The city is gorgeous.' },
    { word: 'curious', translation: 'Curioso', level: 'A2', category: 'Personalidade', example: 'She is curious about music.' },
    { word: 'generous', translation: 'Generoso', level: 'A2', category: 'Personalidade', example: 'He is generous with his time.' },
    { word: 'exhausted', translation: 'Exausto', level: 'A2', category: 'Sentimentos', example: 'I am exhausted after work.' },
    { word: 'reservation', translation: 'Reserva', level: 'A2', category: 'Viagem', example: 'I have a reservation.' },
    { word: 'direction', translation: 'Direção / orientação', level: 'A2', category: 'Viagem', example: 'Can you give me directions?' },
    { word: 'included', translation: 'Incluso', level: 'A2', category: 'Hotel', example: 'Breakfast is included.' },
    { word: 'awkward', translation: 'Constrangedor / desajeitado', level: 'B1', category: 'Conversas', example: 'That was an awkward moment.' },
    { word: 'thrilled', translation: 'Muito empolgado', level: 'B1', category: 'Sentimentos', example: 'I am thrilled about the trip.' },
    { word: 'overwhelmed', translation: 'Sobrecarregado', level: 'B1', category: 'Sentimentos', example: 'I feel overwhelmed today.' },
    { word: 'stubborn', translation: 'Teimoso', level: 'B1', category: 'Personalidade', example: 'He can be stubborn sometimes.' },
    { word: 'reluctant', translation: 'Relutante', level: 'B1', category: 'Atitude', example: 'She was reluctant to answer.' },
    { word: 'ambitious', translation: 'Ambicioso', level: 'B1', category: 'Trabalho', example: 'This is an ambitious goal.' },
    { word: 'accomplish', translation: 'Realizar / conquistar', level: 'B1', category: 'Metas', example: 'You can accomplish a lot.' },
    { word: 'comprehend', translation: 'Compreender', level: 'B1', category: 'Estudo', example: 'I can comprehend the main idea.' },
    { word: 'figure out', translation: 'Descobrir / entender', level: 'B1', category: 'Phrasal verb', example: 'I need to figure out the answer.' },
    { word: 'hang out', translation: 'Sair / passar tempo junto', level: 'B1', category: 'Conversas', example: 'Let us hang out later.' },
    { word: 'crave', translation: 'Ter desejo intenso por', level: 'B2', category: 'Sentimentos', example: 'I crave coffee in the morning.' },
    { word: 'resilient', translation: 'Resiliente / resistente', level: 'B2', category: 'Trabalho', example: 'A resilient person keeps going.' },
    { word: 'thorough', translation: 'Minucioso / detalhado', level: 'B2', category: 'Trabalho', example: 'This is a thorough review.' },
    { word: 'inevitable', translation: 'Inevitável', level: 'B2', category: 'Opinião', example: 'Change is inevitable.' },
    { word: 'subtle', translation: 'Sutil / delicado', level: 'B2', category: 'Nuance', example: 'There is a subtle difference.' },
    { word: 'procrastinate', translation: 'Procrastinar', level: 'B2', category: 'Produtividade', example: 'Do not procrastinate on important tasks.' },
    { word: 'flourish', translation: 'Florescer / prosperar', level: 'B2', category: 'Crescimento', example: 'Students flourish with practice.' },
    { word: 'deadline', translation: 'Prazo final', level: 'B2', category: 'Trabalho', example: 'The deadline is Friday.' },
    { word: 'trade-off', translation: 'Compensação entre ganho e perda', level: 'B2', category: 'Debate', example: 'Every choice has a trade-off.' },
    { word: 'evidence', translation: 'Evidência / prova', level: 'B2', category: 'Debate', example: 'We need evidence for that claim.' },
    { word: 'ubiquitous', translation: 'Presente em todos os lugares', level: 'C1', category: 'Avançado', example: 'Smartphones are ubiquitous now.' },
    { word: 'endeavor', translation: 'Esforçar-se / empreendimento', level: 'C1', category: 'Formal', example: 'We endeavor to improve every day.' },
    { word: 'meticulous', translation: 'Minucioso / preciso', level: 'C1', category: 'Formal', example: 'She is meticulous with details.' },
    { word: 'persevere', translation: 'Perseverar', level: 'C1', category: 'Avançado', example: 'You need to persevere through setbacks.' },
    { word: 'counterproductive', translation: 'Contraproducente', level: 'C1', category: 'Argumento', example: 'That strategy may be counterproductive.' },
    { word: 'misleading', translation: 'Enganoso', level: 'C1', category: 'Argumento', example: 'The chart is technically correct but misleading.' },
    { word: 'assumption', translation: 'Suposição', level: 'C1', category: 'Argumento', example: 'That conclusion depends on one assumption.' },
    { word: 'arguably', translation: 'Pode-se argumentar que', level: 'C1', category: 'Nuance', example: 'This is arguably the best option.' },
    { word: 'albeit', translation: 'Embora / ainda que', level: 'C1', category: 'Conectores', example: 'The plan is useful, albeit costly.' },
    { word: 'reiterate', translation: 'Reiterar / reforçar', level: 'C1', category: 'Formal', example: 'Let me reiterate the main point.' },
    { word: 'please', translation: 'Por favor', level: 'A1', category: 'Educação', example: 'Please help me.', note: 'Use para fazer pedidos de forma educada.' },
    { word: 'thanks', translation: 'Obrigado / valeu', level: 'A1', category: 'Educação', example: 'Thanks for your help.', note: 'Mais casual que "thank you".' },
    { word: 'sorry', translation: 'Desculpa', level: 'A1', category: 'Educação', example: 'Sorry, I am late.', note: 'Serve para pedir desculpa ou chamar atenção.' },
    { word: 'today', translation: 'Hoje', level: 'A1', category: 'Tempo', example: 'I study today.', note: 'Palavra básica para falar de rotina.' },
    { word: 'tomorrow', translation: 'Amanhã', level: 'A1', category: 'Tempo', example: 'See you tomorrow.', note: 'Muito usada para combinar planos.' },
    { word: 'yesterday', translation: 'Ontem', level: 'A1', category: 'Tempo', example: 'I worked yesterday.', note: 'Ajuda a formar frases simples no passado.' },
    { word: 'always', translation: 'Sempre', level: 'A1', category: 'Frequência', example: 'I always drink coffee.', note: 'Normalmente vem antes do verbo principal.' },
    { word: 'sometimes', translation: 'Às vezes', level: 'A1', category: 'Frequência', example: 'I sometimes watch movies.', note: 'Ótima palavra para falar de hábitos.' },
    { word: 'never', translation: 'Nunca', level: 'A1', category: 'Frequência', example: 'I never smoke.', note: 'Já tem sentido negativo.' },
    { word: 'cheap', translation: 'Barato', level: 'A1', category: 'Compras', example: 'This shirt is cheap.', note: 'O oposto de "expensive".' },
    { word: 'expensive', translation: 'Caro', level: 'A1', category: 'Compras', example: 'That phone is expensive.', note: 'Use para falar de preço alto.' },
    { word: 'near', translation: 'Perto', level: 'A1', category: 'Lugar', example: 'The bank is near here.', note: 'Muito útil em viagens.' },
    { word: 'far', translation: 'Longe', level: 'A1', category: 'Lugar', example: 'The airport is far.', note: 'O oposto de "near".' },
    { word: 'busy', translation: 'Ocupado', level: 'A1', category: 'Rotina', example: 'I am busy now.', note: 'Serve para falar de agenda.' },
    { word: 'ready', translation: 'Pronto', level: 'A1', category: 'Rotina', example: 'Are you ready?', note: 'Pergunta comum antes de começar algo.' },
    { word: 'boarding pass', translation: 'Cartão de embarque', level: 'A2', category: 'Viagem', example: 'Here is my boarding pass.', note: 'Essencial no aeroporto.' },
    { word: 'gate', translation: 'Portão de embarque', level: 'A2', category: 'Viagem', example: 'Which gate is it?', note: 'Use para localizar o voo.' },
    { word: 'delay', translation: 'Atraso', level: 'A2', category: 'Viagem', example: 'The flight has a delay.', note: 'Substantivo comum em aeroportos.' },
    { word: 'refund', translation: 'Reembolso', level: 'A2', category: 'Compras', example: 'Can I get a refund?', note: 'Use quando quer dinheiro de volta.' },
    { word: 'exchange', translation: 'Trocar / câmbio', level: 'A2', category: 'Compras', example: 'Can I exchange this?', note: 'Também aparece em "exchange money".' },
    { word: 'appointment', translation: 'Compromisso / consulta', level: 'A2', category: 'Rotina', example: 'I have an appointment at 3.', note: 'Usado para médico, reunião ou horário marcado.' },
    { word: 'available', translation: 'Disponível', level: 'A2', category: 'Trabalho', example: 'Are you available tomorrow?', note: 'Muito usado em conversas profissionais.' },
    { word: 'improve', translation: 'Melhorar', level: 'A2', category: 'Estudo', example: 'I want to improve my English.', note: 'Verbo importante para metas.' },
    { word: 'practice', translation: 'Praticar / prática', level: 'A2', category: 'Estudo', example: 'Practice every day.', note: 'Pode ser verbo ou substantivo.' },
    { word: 'mistake', translation: 'Erro', level: 'A2', category: 'Estudo', example: 'This is a common mistake.', note: 'Use para falar de aprendizado.' },
    { word: 'borrow', translation: 'Pegar emprestado', level: 'A2', category: 'Ação', example: 'Can I borrow your pen?', note: 'Você recebe algo temporariamente.' },
    { word: 'lend', translation: 'Emprestar', level: 'A2', category: 'Ação', example: 'Can you lend me your pen?', note: 'Você entrega algo temporariamente.' },
    { word: 'matter', translation: 'Importar / assunto', level: 'A2', category: 'Conversas', example: 'It does not matter.', note: 'Frase muito comum no dia a dia.' },
    { word: 'instead', translation: 'Em vez disso', level: 'A2', category: 'Conectores', example: 'Let us walk instead.', note: 'Serve para trocar uma opção por outra.' },
    { word: 'although', translation: 'Embora', level: 'B1', category: 'Conectores', example: 'Although it rained, we went out.', note: 'Liga ideias opostas.' },
    { word: 'however', translation: 'No entanto', level: 'B1', category: 'Conectores', example: 'I agree. However, it is expensive.', note: 'Mais formal que "but".' },
    { word: 'therefore', translation: 'Portanto', level: 'B1', category: 'Conectores', example: 'I was sick; therefore, I stayed home.', note: 'Mostra consequência.' },
    { word: 'avoid', translation: 'Evitar', level: 'B1', category: 'Ação', example: 'Avoid drinking too much soda.', note: 'Depois dele, use verbo com -ing.' },
    { word: 'achieve', translation: 'Alcançar / conquistar', level: 'B1', category: 'Metas', example: 'You can achieve your goals.', note: 'Muito usado com metas e resultados.' },
    { word: 'manage to', translation: 'Conseguir fazer', level: 'B1', category: 'Expressão', example: 'I managed to finish the task.', note: 'Indica esforço para conseguir algo.' },
    { word: 'used to', translation: 'Costumava', level: 'B1', category: 'Gramática', example: 'I used to play soccer.', note: 'Fala de hábito antigo que mudou.' },
    { word: 'in charge of', translation: 'Responsável por', level: 'B1', category: 'Trabalho', example: 'She is in charge of the team.', note: 'Expressão comum no trabalho.' },
    { word: 'deal with', translation: 'Lidar com', level: 'B1', category: 'Phrasal verb', example: 'I can deal with this problem.', note: 'Use para problemas, pessoas ou tarefas.' },
    { word: 'show up', translation: 'Aparecer / comparecer', level: 'B1', category: 'Phrasal verb', example: 'He did not show up.', note: 'Muito comum em conversas.' },
    { word: 'run out of', translation: 'Ficar sem', level: 'B1', category: 'Phrasal verb', example: 'We ran out of time.', note: 'Use quando algo acaba.' },
    { word: 'look forward to', translation: 'Estar ansioso por', level: 'B1', category: 'Expressão', example: 'I look forward to hearing from you.', note: 'Depois de "to", use substantivo ou -ing.' },
    { word: 'worth it', translation: 'Vale a pena', level: 'B1', category: 'Opinião', example: 'The course is worth it.', note: 'Frase curta e muito natural.' },
    { word: 'make sense', translation: 'Fazer sentido', level: 'B1', category: 'Conversas', example: 'That makes sense.', note: 'Use para concordar com uma explicação.' },
    { word: 'keep in mind', translation: 'Ter em mente', level: 'B1', category: 'Expressão', example: 'Keep in mind that it takes time.', note: 'Boa para explicar ou aconselhar.' },
    { word: 'nevertheless', translation: 'Mesmo assim / no entanto', level: 'B2', category: 'Conectores', example: 'It was hard. Nevertheless, we finished.', note: 'Conector mais avançado para contraste.' },
    { word: 'whereas', translation: 'Enquanto / ao passo que', level: 'B2', category: 'Conectores', example: 'I like tea, whereas she prefers coffee.', note: 'Compara duas ideias.' },
    { word: 'regardless', translation: 'Independentemente', level: 'B2', category: 'Conectores', example: 'We will continue regardless.', note: 'Pode aparecer como "regardless of".' },
    { word: 'insight', translation: 'Percepção / ideia útil', level: 'B2', category: 'Trabalho', example: 'That report gave us useful insights.', note: 'Muito usado em negócios.' },
    { word: 'constraint', translation: 'Restrição / limitação', level: 'B2', category: 'Trabalho', example: 'Time is our biggest constraint.', note: 'Use para limites reais de projeto.' },
    { word: 'reliable', translation: 'Confiável', level: 'B2', category: 'Descrição', example: 'This source is reliable.', note: 'Algo ou alguém em quem se pode confiar.' },
    { word: 'accurate', translation: 'Preciso / correto', level: 'B2', category: 'Descrição', example: 'The answer is accurate.', note: 'Fala de informação correta.' },
    { word: 'noticeable', translation: 'Perceptível', level: 'B2', category: 'Descrição', example: 'There is a noticeable improvement.', note: 'Algo fácil de perceber.' },
    { word: 'struggle with', translation: 'Ter dificuldade com', level: 'B2', category: 'Expressão', example: 'I struggle with pronunciation.', note: 'Muito natural para falar de dificuldades.' },
    { word: 'come across', translation: 'Encontrar por acaso', level: 'B2', category: 'Phrasal verb', example: 'I came across an old photo.', note: 'Também pode significar "parecer".' },
    { word: 'bring up', translation: 'Mencionar / levantar assunto', level: 'B2', category: 'Phrasal verb', example: 'She brought up an important point.', note: 'Útil em reuniões e conversas.' },
    { word: 'carry out', translation: 'Executar / realizar', level: 'B2', category: 'Phrasal verb', example: 'We carried out the plan.', note: 'Mais formal que "do".' },
    { word: 'rule out', translation: 'Descartar', level: 'B2', category: 'Phrasal verb', example: 'We cannot rule out that option.', note: 'Use para eliminar possibilidades.' },
    { word: 'take into account', translation: 'Levar em consideração', level: 'B2', category: 'Expressão', example: 'Take the cost into account.', note: 'Muito usado para decisões.' },
    { word: 'by no means', translation: 'De forma alguma', level: 'C1', category: 'Ênfase', example: 'This is by no means easy.', note: 'Expressão forte de negação.' },
    { word: 'for the sake of', translation: 'Pelo bem de', level: 'C1', category: 'Formal', example: 'For the sake of clarity, let us simplify.', note: 'Comum em explicações formais.' },
    { word: 'on behalf of', translation: 'Em nome de', level: 'C1', category: 'Formal', example: 'I am writing on behalf of the team.', note: 'Muito usado em e-mails.' },
    { word: 'notwithstanding', translation: 'Apesar de', level: 'C1', category: 'Formal', example: 'Notwithstanding the risks, we proceeded.', note: 'Conector formal de contraste.' },
    { word: 'compelling', translation: 'Convincente / atraente', level: 'C1', category: 'Argumento', example: 'That is a compelling argument.', note: 'Forte para opinião e persuasão.' },
    { word: 'nuanced', translation: 'Com nuances / detalhado', level: 'C1', category: 'Argumento', example: 'We need a nuanced answer.', note: 'Indica análise sem simplificação excessiva.' },
    { word: 'scrutinize', translation: 'Examinar cuidadosamente', level: 'C1', category: 'Formal', example: 'The team scrutinized the proposal.', note: 'Verbo formal para análise rigorosa.' },
    { word: 'mitigate', translation: 'Reduzir / amenizar', level: 'C1', category: 'Trabalho', example: 'We need to mitigate the risk.', note: 'Muito usado em planejamento.' },
    { word: 'jeopardize', translation: 'Colocar em risco', level: 'C1', category: 'Formal', example: 'Delays can jeopardize the project.', note: 'Mais forte que "risk".' },
    { word: 'undermine', translation: 'Prejudicar / enfraquecer', level: 'C1', category: 'Argumento', example: 'That mistake undermined trust.', note: 'Use para algo que enfraquece uma base.' },
    { word: 'convey', translation: 'Transmitir / expressar', level: 'C1', category: 'Comunicação', example: 'The message conveys confidence.', note: 'Verbo formal para comunicar significado.' },
    { word: 'elaborate', translation: 'Explicar em detalhes', level: 'C1', category: 'Comunicação', example: 'Could you elaborate on that?', note: 'Pergunta educada para pedir mais detalhes.' },
    { word: 'drawback', translation: 'Desvantagem', level: 'C1', category: 'Debate', example: 'The main drawback is the cost.', note: 'Muito útil para comparar opções.' },
    { word: 'feasible', translation: 'Viável', level: 'C1', category: 'Trabalho', example: 'This timeline is feasible.', note: 'Use para dizer que algo pode ser feito.' },
    { word: 'proficient', translation: 'Proficiente / habilidoso', level: 'C1', category: 'Habilidade', example: 'She is proficient in English.', note: 'Indica domínio sólido de uma habilidade.' },
  ];

  const dailySortKey = (word, seed) => {
    const value = `${seed}-${word}`;
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
  };

  const enrichFlashcard = (card) => {
    const metadata = FLASHCARD_VOCAB.find(v => v.word === card.word) || {};
    return { ...metadata, ...card };
  };

  // Get available flashcards
  app.get('/api/flashcards/available', authenticateToken, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const flashcards = await supabaseGetFlashcards(req.user.id);
      const due = flashcards.filter(f => f.next_review && f.next_review <= now).map(enrichFlashcard);
      const seen = due.map(d => d.word);

      if (due.length < 20) {
        const user = await supabaseGetUserById(req.user.id).catch(() => null);
        const userLevel = normalizeLevel(user?.english_level);
        const today = new Date().toISOString().slice(0, 10);
        const seed = `${req.user.id}-${today}`;
        const upcoming = flashcards.filter(f => f.next_review && f.next_review > now);
        seen.push(...upcoming.map(u => u.word));
        const newWords = FLASHCARD_VOCAB
          .filter(v => !seen.includes(v.word))
          .sort((a, b) => {
            const distance = levelDistance(a.level, userLevel) - levelDistance(b.level, userLevel);
            if (distance !== 0) return distance;
            return dailySortKey(a.word, seed) - dailySortKey(b.word, seed);
          })
          .slice(0, 20 - due.length);
        const newItems = newWords.map(w => ({ ...w, ease_factor: 2.5, interval_days: 1, next_review: now, repetitions: 0, isNew: true }));
        res.json({ cards: [...due, ...newItems] });
      } else {
        res.json({ cards: due.slice(0, 20) });
      }
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // Review flashcard
  app.post('/api/flashcards/review', authenticateToken, validateBody(flashcardReviewSchema), async (req, res) => {
    const { word, translation, quality } = req.validatedBody;

    try {
      const flashcards = await supabaseGetFlashcards(req.user.id);
      const review = flashcards.find(f => f.word === word);

      let easeFactor = 2.5;
      let interval = 1;
      let repetitions = 0;

      if (review) {
        easeFactor = review.ease_factor;
        repetitions = review.repetitions;
        interval = review.interval_days;
      }

      // SM-2 update
      if (quality >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        repetitions += 1;
      } else {
        repetitions = 0;
        interval = 1;
      }

      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await supabaseUpsertFlashcard(req.user.id, word, translation, {
        ease_factor: easeFactor,
        interval_days: interval,
        next_review: nextReview.toISOString(),
        repetitions
      });

      res.json({ success: true, next_review: nextReview.toISOString(), interval });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao processar review' });
    }
  });

  // Get flashcard stats
  app.get('/api/flashcards/stats', authenticateToken, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const flashcards = await supabaseGetFlashcards(req.user.id);
      const due = flashcards.filter(f => f.next_review && f.next_review <= now);
      res.json({ due: due.length, total: flashcards.length });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });
}

module.exports = { setupFlashcardRoutes };
