export type LessonQuestion = {
  id: string;
  prompt: string;
  helper: string;
  choices: string[];
  answer: number;
  explain: string;
};

export type LessonSet = {
  id: string;
  title: string;
  level: string;
  focus: string;
  xp: number;
  questions: LessonQuestion[];
};

export const lessonSets: LessonSet[] = [
  {
    id: 'daily-basics',
    title: 'Base diaria',
    level: 'A1',
    focus: 'Frases curtas para rotina, apresentacao e pedidos simples.',
    xp: 60,
    questions: [
      {
        id: 'daily-1',
        prompt: 'Como voce diz "Eu preciso de agua" em ingles?',
        helper: 'Pense em uma necessidade simples.',
        choices: ['I need water', 'I have water', 'I want waters', 'I am water'],
        answer: 0,
        explain: '"Need" expressa necessidade; "water" fica sem plural nesse uso.'
      },
      {
        id: 'daily-2',
        prompt: 'Complete: "She ___ from Brazil."',
        helper: 'Use o verbo to be com she.',
        choices: ['are', 'is', 'am', 'be'],
        answer: 1,
        explain: 'Com she/he/it, o verbo to be vira "is".'
      },
      {
        id: 'daily-3',
        prompt: 'O que significa "How much is it?"',
        helper: 'Frase comum em loja ou restaurante.',
        choices: ['Quanto custa?', 'Onde fica?', 'Que horas sao?', 'Como voce esta?'],
        answer: 0,
        explain: '"How much" pergunta preco ou quantidade.'
      },
      {
        id: 'daily-4',
        prompt: 'Escolha a pergunta correta.',
        helper: 'Use auxiliar antes do sujeito.',
        choices: ['You like coffee?', 'Do you like coffee?', 'Like you coffee?', 'Are like coffee?'],
        answer: 1,
        explain: 'No presente simples, perguntas com I/you/we/they usam "do".'
      }
    ]
  },
  {
    id: 'native-slang',
    title: 'Giria de nativos',
    level: 'B1',
    focus: 'Expressoes naturais que aparecem em videos, series e conversas.',
    xp: 70,
    questions: [
      {
        id: 'slang-1',
        prompt: 'O que "I am down" quer dizer em uma conversa casual?',
        helper: 'Exemplo: "Pizza tonight?" "I am down."',
        choices: ['Estou triste', 'Eu topo', 'Estou descendo', 'Eu esqueci'],
        answer: 1,
        explain: '"I am down" pode significar "eu topo" quando alguem sugere algo.'
      },
      {
        id: 'slang-2',
        prompt: 'Qual frase soa mais natural para "vamos sair hoje"?',
        helper: 'Contexto informal.',
        choices: ["Let's hang out today", "Let's exit today", 'We go out current day', 'Let us outside now'],
        answer: 0,
        explain: '"Hang out" e uma forma natural de dizer passar tempo junto.'
      },
      {
        id: 'slang-3',
        prompt: 'O que "That was a close call" significa?',
        helper: 'Usado depois de quase dar errado.',
        choices: ['Foi por pouco', 'Foi muito caro', 'Foi uma ligacao curta', 'Foi combinado'],
        answer: 0,
        explain: '"Close call" e uma situacao que quase virou problema.'
      },
      {
        id: 'slang-4',
        prompt: 'Complete: "No worries, I got ___."',
        helper: 'Frase para dizer que voce resolve.',
        choices: ['this', 'these', 'those', 'there'],
        answer: 0,
        explain: '"I got this" significa "deixa comigo".'
      }
    ]
  },
  {
    id: 'travel-ready',
    title: 'Inglês para viagem',
    level: 'A2',
    focus: 'Aeroporto, hotel, direções e emergências pequenas.',
    xp: 65,
    questions: [
      {
        id: 'travel-1',
        prompt: 'Como pedir direção para a estação?',
        helper: 'Use uma pergunta educada.',
        choices: ['Where is the station?', 'How far is the station?', 'Is this the station?', 'Where is the hotel?'],
        answer: 0,
        explain: '"Where is..." pergunta localização.'
      },
      {
        id: 'travel-2',
        prompt: 'Complete: "I have a reservation ___ two nights."',
        helper: 'Duração usa for.',
        choices: ['since', 'for', 'at', 'by'],
        answer: 1,
        explain: '"For two nights" indica duração.'
      },
      {
        id: 'travel-3',
        prompt: 'O que "boarding pass" significa?',
        helper: 'Documento usado no avião.',
        choices: ['Cartão de embarque', 'Passaporte', 'Mala de mão', 'Portão de embarque'],
        answer: 0,
        explain: '"Boarding pass" é o cartão usado para embarcar.'
      },
      {
        id: 'travel-4',
        prompt: 'Qual frase é melhor para pedir ajuda?',
        helper: 'Frase educada e direta.',
        choices: ['Help me now', 'Could you help me, please?', 'You help?', 'I want help you'],
        answer: 1,
        explain: '"Could you..." deixa o pedido mais educado.'
      }
    ]
  },
  {
    id: 'business-talk',
    title: 'Reuniões e trabalho',
    level: 'B2',
    focus: 'Comunicar prioridade, prazos, opiniões e follow-up.',
    xp: 80,
    questions: [
      {
        id: 'business-1',
        prompt: 'O que "deadline" significa?',
        helper: 'Muito usado em projetos.',
        choices: ['Prazo final', 'Reuniao curta', 'Orcamento', 'Contratacao'],
        answer: 0,
        explain: '"Deadline" e a data limite para entregar algo.'
      },
      {
        id: 'business-2',
        prompt: 'Complete: "Let me ___ up on that after the meeting."',
        helper: 'Expressao para acompanhar um assunto.',
        choices: ['follow', 'make', 'take', 'set'],
        answer: 0,
        explain: '"Follow up" significa acompanhar ou retomar um assunto.'
      },
      {
        id: 'business-3',
        prompt: 'Qual frase suaviza uma discordancia?',
        helper: 'Tom profissional.',
        choices: ['You are wrong', 'I see your point, but...', 'No, impossible', 'That makes no sense'],
        answer: 1,
        explain: '"I see your point, but..." reconhece a ideia antes de discordar.'
      },
      {
        id: 'business-4',
        prompt: 'O que "We are on track" quer dizer?',
        helper: 'Status de projeto.',
        choices: ['Estamos dentro do planejado', 'Estamos atrasados', 'Estamos sem pista', 'Estamos contratando'],
        answer: 0,
        explain: '"On track" indica que tudo segue conforme o plano.'
      }
    ]
  },
  {
    id: 'phrasal-verbs',
    title: 'Phrasal verbs uteis',
    level: 'B1',
    focus: 'Verbos compostos que aparecem o tempo todo em fala natural.',
    xp: 75,
    questions: [
      {
        id: 'phrasal-1',
        prompt: 'O que "give up" significa?',
        helper: 'Exemplo: "Do not give up now."',
        choices: ['Desistir', 'Entregar', 'Crescer', 'Aparecer'],
        answer: 0,
        explain: '"Give up" significa desistir ou parar de tentar.'
      },
      {
        id: 'phrasal-2',
        prompt: 'Complete: "I need to figure ___ this problem."',
        helper: 'Expressao para resolver ou entender algo.',
        choices: ['out', 'up', 'in', 'by'],
        answer: 0,
        explain: '"Figure out" significa descobrir, resolver ou entender.'
      },
      {
        id: 'phrasal-3',
        prompt: 'O que "turn out" pode significar?',
        helper: 'Exemplo: "It turned out well."',
        choices: ['Acabar sendo', 'Virar fisicamente', 'Desligar sempre', 'Chegar atrasado'],
        answer: 0,
        explain: '"Turn out" indica o resultado final de uma situacao.'
      },
      {
        id: 'phrasal-4',
        prompt: 'Qual frase usa "look forward to" corretamente?',
        helper: 'Depois de "to", use verbo com -ing.',
        choices: ['I look forward to meeting you', 'I look forward meet you', 'I look forward to meet you', 'I look forward for meeting you'],
        answer: 0,
        explain: 'A estrutura correta e "look forward to" + verbo com -ing.'
      }
    ]
  },
  {
    id: 'pronunciation-patterns',
    title: 'Pronuncia e ritmo',
    level: 'A2',
    focus: 'Padroes de fala rapida para entender melhor nativos.',
    xp: 65,
    questions: [
      {
        id: 'pron-1',
        prompt: '"Gonna" e forma reduzida de:',
        helper: 'Muito comum em fala informal.',
        choices: ['going to', 'got to', 'gone to', 'go now'],
        answer: 0,
        explain: '"Gonna" representa "going to" em fala casual.'
      },
      {
        id: 'pron-2',
        prompt: '"Wanna" geralmente significa:',
        helper: 'Exemplo: "I wanna learn."',
        choices: ['want to', 'went to', 'one of', 'want a only'],
        answer: 0,
        explain: '"Wanna" vem de "want to".'
      },
      {
        id: 'pron-3',
        prompt: 'Em fala rapida, "did you" pode soar como:',
        helper: 'Som comum em perguntas.',
        choices: ['didja', 'didoo', 'diyes', 'do you did'],
        answer: 0,
        explain: '"Did you" muitas vezes se junta e soa como "didja".'
      },
      {
        id: 'pron-4',
        prompt: 'Qual palavra tem o som inicial diferente?',
        helper: 'Compare o som de th.',
        choices: ['tree', 'think', 'three', 'through'],
        answer: 0,
        explain: '"Tree" comeca com /tr/; as outras usam som de "th".'
      }
    ]
  },
  {
    id: 'confidence-builder',
    title: 'Frases de confianca',
    level: 'A2',
    focus: 'Frases prontas para ganhar tempo, pedir repeticao e continuar falando.',
    xp: 60,
    questions: [
      {
        id: 'conf-1',
        prompt: 'Como dizer "Pode repetir, por favor?"',
        helper: 'Pedido educado.',
        choices: ['Could you repeat that, please?', 'Can repeat please you?', 'Repeat me, please?', 'You can again?'],
        answer: 0,
        explain: '"Could you..." e uma forma educada de pedir repeticao.'
      },
      {
        id: 'conf-2',
        prompt: 'O que "Let me think for a second" comunica?',
        helper: 'Use para ganhar tempo.',
        choices: ['Deixe-me pensar por um segundo', 'Deixe-me sair agora', 'Pense por mim', 'Eu nao entendi nada'],
        answer: 0,
        explain: 'Essa frase compra tempo sem quebrar a conversa.'
      },
      {
        id: 'conf-3',
        prompt: 'Qual frase pede confirmacao?',
        helper: 'Boa para checar entendimento.',
        choices: ['Do you mean...?', 'You are mean', 'What mean you?', 'I mean you'],
        answer: 0,
        explain: '"Do you mean...?" confirma o que a outra pessoa quis dizer.'
      },
      {
        id: 'conf-4',
        prompt: 'Complete: "I am not sure, but I ___..."',
        helper: 'Forma natural de dar opiniao com cuidado.',
        choices: ['think', 'thinking', 'thought', 'thinks'],
        answer: 0,
        explain: '"I think" introduz uma opiniao simples.'
      }
    ]
  }
];
