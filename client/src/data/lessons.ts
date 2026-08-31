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
    title: 'Base diária',
    level: 'A1',
    focus: 'Frases curtas para rotina, apresentação e pedidos simples.',
    xp: 60,
    questions: [
      {
        id: 'daily-1',
        prompt: 'Como você diz "Eu preciso de água" em inglês?',
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
        choices: ['Quanto custa?', 'Onde fica?', 'Que horas são?', 'Como você está?'],
        answer: 0,
        explain: '"How much" pergunta preço ou quantidade.'
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
    title: 'Gíria de nativos',
    level: 'B1',
    focus: 'Expressões naturais que aparecem em vídeos, séries e conversas.',
    xp: 70,
    questions: [
      {
        id: 'slang-1',
        prompt: 'O que "I am down" quer dizer em uma conversa casual?',
        helper: 'Exemplo: "Pizza tonight?" "I am down."',
        choices: ['Estou triste', 'Eu topo', 'Estou descendo', 'Eu esqueci'],
        answer: 1,
        explain: '"I am down" pode significar "eu topo" quando alguém sugere algo.'
      },
      {
        id: 'slang-2',
        prompt: 'Qual frase soa mais natural para "vamos sair hoje"?',
        helper: 'Contexto informal.',
        choices: ["Let's hang out today", "Let's exit today", 'We go out current day', 'Let us outside now'],
        answer: 0,
        explain: '"Hang out" é uma forma natural de dizer passar tempo junto.'
      },
      {
        id: 'slang-3',
        prompt: 'O que "That was a close call" significa?',
        helper: 'Usado depois de quase dar errado.',
        choices: ['Foi por pouco', 'Foi muito caro', 'Foi uma ligação curta', 'Foi combinado'],
        answer: 0,
        explain: '"Close call" é uma situação que quase virou problema.'
      },
      {
        id: 'slang-4',
        prompt: 'Complete: "No worries, I got ___."',
        helper: 'Frase para dizer que você resolve.',
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
        choices: ['Prazo final', 'Reunião curta', 'Orçamento', 'Contratação'],
        answer: 0,
        explain: '"Deadline" é a data limite para entregar algo.'
      },
      {
        id: 'business-2',
        prompt: 'Complete: "Let me ___ up on that after the meeting."',
        helper: 'Expressão para acompanhar um assunto.',
        choices: ['follow', 'make', 'take', 'set'],
        answer: 0,
        explain: '"Follow up" significa acompanhar ou retomar um assunto.'
      },
      {
        id: 'business-3',
        prompt: 'Qual frase suaviza uma discordância?',
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
    id: 'advanced-expression',
    title: 'Expressão avançada',
    level: 'C1',
    focus: 'Nuance, precisão, idioms e linguagem natural em contextos complexos.',
    xp: 90,
    questions: [
      {
        id: 'advanced-1',
        prompt: 'O que "to shed light on something" significa?',
        helper: 'Expressão comum em explicações detalhadas.',
        choices: ['Esclarecer algo', 'Esconder algo', 'Criticar alguém', 'Apagar a luz'],
        answer: 0,
        explain: '"Shed light on" significa esclarecer ou tornar algo mais compreensível.'
      },
      {
        id: 'advanced-2',
        prompt: 'Escolha a frase mais natural em tom profissional.',
        helper: 'Procure precisão sem soar agressivo.',
        choices: [
          'Your idea is bad',
          'I would frame it slightly differently',
          'This is wrong completely',
          'You must change all'
        ],
        answer: 1,
        explain: '"I would frame it slightly differently" suaviza a discordância e mantém precisão.'
      },
      {
        id: 'advanced-3',
        prompt: 'Complete: "The issue is not lack of effort, but rather a lack of ___."',
        helper: 'Substantivo abstrato em contexto analítico.',
        choices: ['alignment', 'align', 'aligned', 'aligning'],
        answer: 0,
        explain: 'Depois de "lack of", use um substantivo: "alignment".'
      },
      {
        id: 'advanced-4',
        prompt: 'O que "That is beside the point" quer dizer?',
        helper: 'Usado quando algo foge do tema principal.',
        choices: ['Isso não vem ao caso', 'Isso é essencial', 'Isso está ao lado', 'Isso resolve tudo'],
        answer: 0,
        explain: '"Beside the point" indica que algo não é relevante para a discussão.'
      }
    ]
  },
  {
    id: 'phrasal-verbs',
    title: 'Phrasal verbs úteis',
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
        helper: 'Expressão para resolver ou entender algo.',
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
        explain: '"Turn out" indica o resultado final de uma situação.'
      },
      {
        id: 'phrasal-4',
        prompt: 'Qual frase usa "look forward to" corretamente?',
        helper: 'Depois de "to", use verbo com -ing.',
        choices: ['I look forward to meeting you', 'I look forward meet you', 'I look forward to meet you', 'I look forward for meeting you'],
        answer: 0,
        explain: 'A estrutura correta é "look forward to" + verbo com -ing.'
      }
    ]
  },
  {
    id: 'pronunciation-patterns',
    title: 'Pronúncia e ritmo',
    level: 'A2',
    focus: 'Padrões de fala rápida para entender melhor nativos.',
    xp: 65,
    questions: [
      {
        id: 'pron-1',
        prompt: '"Gonna" é forma reduzida de:',
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
        prompt: 'Em fala rápida, "did you" pode soar como:',
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
        explain: '"Tree" começa com /tr/; as outras usam som de "th".'
      }
    ]
  },
  {
    id: 'confidence-builder',
    title: 'Frases de confiança',
    level: 'A2',
    focus: 'Frases prontas para ganhar tempo, pedir repetição e continuar falando.',
    xp: 60,
    questions: [
      {
        id: 'conf-1',
        prompt: 'Como dizer "Pode repetir, por favor?"',
        helper: 'Pedido educado.',
        choices: ['Could you repeat that, please?', 'Can repeat please you?', 'Repeat me, please?', 'You can again?'],
        answer: 0,
        explain: '"Could you..." é uma forma educada de pedir repetição.'
      },
      {
        id: 'conf-2',
        prompt: 'O que "Let me think for a second" comunica?',
        helper: 'Use para ganhar tempo.',
        choices: ['Deixe-me pensar por um segundo', 'Deixe-me sair agora', 'Pense por mim', 'Eu não entendi nada'],
        answer: 0,
        explain: 'Essa frase compra tempo sem quebrar a conversa.'
      },
      {
        id: 'conf-3',
        prompt: 'Qual frase pede confirmação?',
        helper: 'Boa para checar entendimento.',
        choices: ['Do you mean...?', 'You are mean', 'What mean you?', 'I mean you'],
        answer: 0,
        explain: '"Do you mean...?" confirma o que a outra pessoa quis dizer.'
      },
      {
        id: 'conf-4',
        prompt: 'Complete: "I am not sure, but I ___..."',
        helper: 'Forma natural de dar opinião com cuidado.',
        choices: ['think', 'thinking', 'thought', 'thinks'],
        answer: 0,
        explain: '"I think" introduz uma opinião simples.'
      }
    ]
  },
  {
    id: 'introductions-a1',
    title: 'Apresentações simples',
    level: 'A1',
    focus: 'Nome, origem, idade, profissão e primeiras conversas.',
    xp: 60,
    questions: [
      {
        id: 'intro-a1-1',
        prompt: 'Como você diz "Meu nome é Ana" em inglês?',
        helper: 'Use a estrutura mais comum para se apresentar.',
        choices: ['My name is Ana', 'I name Ana', 'Me name is Ana', 'My Ana name'],
        answer: 0,
        explain: '"My name is..." é a forma direta e natural de dizer seu nome.'
      },
      {
        id: 'intro-a1-2',
        prompt: 'Complete: "I ___ from Brazil."',
        helper: 'Use o verbo to be com I.',
        choices: ['am', 'is', 'are', 'be'],
        answer: 0,
        explain: 'Com "I", o verbo to be fica "am".'
      },
      {
        id: 'intro-a1-3',
        prompt: 'O que significa "Nice to meet you"?',
        helper: 'Frase usada quando você conhece alguém.',
        choices: ['Prazer em conhecer você', 'Boa noite', 'Até amanhã', 'Qual é seu nome?'],
        answer: 0,
        explain: '"Nice to meet you" é usado ao conhecer uma pessoa.'
      },
      {
        id: 'intro-a1-4',
        prompt: 'Escolha a pergunta correta para "De onde você é?"',
        helper: 'Pergunta comum em apresentação.',
        choices: ['Where are you from?', 'Where you are from?', 'What are you from?', 'From where you?'],
        answer: 0,
        explain: 'Em perguntas com verbo to be, usamos "are" antes de "you".'
      }
    ]
  },
  {
    id: 'food-orders-a1',
    title: 'Comida e pedidos',
    level: 'A1',
    focus: 'Pedir comida, bebida e entender frases simples de restaurante.',
    xp: 60,
    questions: [
      {
        id: 'food-a1-1',
        prompt: 'Como pedir "um café, por favor"?',
        helper: 'Pedido simples e educado.',
        choices: ['A coffee, please', 'Coffee one, please', 'One please coffee', 'I coffee please'],
        answer: 0,
        explain: '"A coffee, please" é curto, correto e educado.'
      },
      {
        id: 'food-a1-2',
        prompt: 'O que significa "menu"?',
        helper: 'Você pede isso no restaurante.',
        choices: ['Cardápio', 'Conta', 'Mesa', 'Garçom'],
        answer: 0,
        explain: '"Menu" é o cardápio com comidas e bebidas.'
      },
      {
        id: 'food-a1-3',
        prompt: 'Complete: "I would like ___ water."',
        helper: 'Use uma palavra para pedir água.',
        choices: ['some', 'many', 'anys', 'muchs'],
        answer: 0,
        explain: '"Some water" soa natural em um pedido.'
      },
      {
        id: 'food-a1-4',
        prompt: 'Como perguntar "A conta, por favor"?',
        helper: 'Frase útil no fim da refeição.',
        choices: ['The check, please', 'The money, please', 'A table, please', 'Food, please'],
        answer: 0,
        explain: 'Nos EUA, "the check" é uma forma comum de pedir a conta.'
      }
    ]
  },
  {
    id: 'shopping-a2',
    title: 'Compras e preços',
    level: 'A2',
    focus: 'Tamanho, preço, pagamento e trocas em lojas.',
    xp: 65,
    questions: [
      {
        id: 'shopping-a2-1',
        prompt: 'Como perguntar "Você tem tamanho médio?"',
        helper: 'Pergunta comum em loja de roupa.',
        choices: ['Do you have medium?', 'Are you medium?', 'Have you medium?', 'Is medium you?'],
        answer: 0,
        explain: '"Do you have..." é usado para perguntar se a loja tem algo.'
      },
      {
        id: 'shopping-a2-2',
        prompt: 'O que significa "receipt"?',
        helper: 'Você recebe depois de pagar.',
        choices: ['Recibo', 'Desconto', 'Provador', 'Entrega'],
        answer: 0,
        explain: '"Receipt" é o comprovante da compra.'
      },
      {
        id: 'shopping-a2-3',
        prompt: 'Complete: "Can I pay ___ card?"',
        helper: 'Forma comum de perguntar sobre pagamento.',
        choices: ['by', 'on', 'in', 'at'],
        answer: 0,
        explain: 'A expressão correta é "pay by card".'
      },
      {
        id: 'shopping-a2-4',
        prompt: 'Qual frase pede um desconto?',
        helper: 'Use uma pergunta educada.',
        choices: ['Is there any discount?', 'Give me cheap', 'You discount now?', 'This less money?'],
        answer: 0,
        explain: '"Is there any discount?" é clara e educada.'
      }
    ]
  },
  {
    id: 'health-a2',
    title: 'Saúde e emergência',
    level: 'A2',
    focus: 'Descrever sintomas, pedir ajuda e explicar necessidades básicas.',
    xp: 70,
    questions: [
      {
        id: 'health-a2-1',
        prompt: 'Como dizer "Estou com dor de cabeça"?',
        helper: 'Use a expressão com "have".',
        choices: ['I have a headache', 'I am headache', 'I do headache', 'I take headache'],
        answer: 0,
        explain: 'Em inglês, dizemos "I have a headache".'
      },
      {
        id: 'health-a2-2',
        prompt: 'O que significa "pharmacy"?',
        helper: 'Lugar para comprar remédio.',
        choices: ['Farmácia', 'Hospital', 'Consulta', 'Receita'],
        answer: 0,
        explain: '"Pharmacy" é farmácia.'
      },
      {
        id: 'health-a2-3',
        prompt: 'Complete: "I need ___ doctor."',
        helper: 'Use artigo antes de profissão.',
        choices: ['a', 'an', 'the always', 'some'],
        answer: 0,
        explain: 'Antes de "doctor", usamos "a doctor".'
      },
      {
        id: 'health-a2-4',
        prompt: 'Qual frase pede ajuda em emergência?',
        helper: 'Frase direta e urgente.',
        choices: ['Call an ambulance, please', 'Buy an ambulance, please', 'Where ambulance is?', 'I am ambulance'],
        answer: 0,
        explain: '"Call an ambulance, please" pede para chamar uma ambulância.'
      }
    ]
  },
  {
    id: 'opinions-b1',
    title: 'Opiniões naturais',
    level: 'B1',
    focus: 'Concordar, discordar e explicar preferências com naturalidade.',
    xp: 75,
    questions: [
      {
        id: 'opinions-b1-1',
        prompt: 'Qual frase soa natural para dar opinião?',
        helper: 'Comece com uma estrutura comum.',
        choices: ['In my opinion, it is useful', 'My opinion it useful', 'For me opinion useful', 'I opinion that useful'],
        answer: 0,
        explain: '"In my opinion..." é uma forma comum de introduzir opinião.'
      },
      {
        id: 'opinions-b1-2',
        prompt: 'O que "I agree with you" significa?',
        helper: 'Resposta em discussão.',
        choices: ['Eu concordo com você', 'Eu discordo de você', 'Eu espero por você', 'Eu entendo você'],
        answer: 0,
        explain: '"Agree with" significa concordar com alguém.'
      },
      {
        id: 'opinions-b1-3',
        prompt: 'Complete: "I prefer coffee ___ tea."',
        helper: 'Comparação de preferência.',
        choices: ['to', 'than', 'from', 'by'],
        answer: 0,
        explain: 'Com "prefer", a estrutura comum é "prefer X to Y".'
      },
      {
        id: 'opinions-b1-4',
        prompt: 'Qual frase discorda de forma educada?',
        helper: 'Evite soar agressivo.',
        choices: ['I am not sure I agree', 'You are totally wrong', 'No, never', 'This is stupid'],
        answer: 0,
        explain: '"I am not sure I agree" suaviza a discordância.'
      }
    ]
  },
  {
    id: 'storytelling-b1',
    title: 'Contar histórias',
    level: 'B1',
    focus: 'Narrar acontecimentos, conectar ideias e usar passado com clareza.',
    xp: 75,
    questions: [
      {
        id: 'story-b1-1',
        prompt: 'Complete: "Yesterday, I ___ to the mall."',
        helper: 'Use passado de go.',
        choices: ['went', 'go', 'gone', 'going'],
        answer: 0,
        explain: 'O passado de "go" é "went".'
      },
      {
        id: 'story-b1-2',
        prompt: 'O que "then" faz em uma história?',
        helper: 'Conecta acontecimentos.',
        choices: ['Mostra a próxima ação', 'Mostra uma negação', 'Mostra quantidade', 'Mostra posse'],
        answer: 0,
        explain: '"Then" organiza sequência: primeiro algo aconteceu, depois outra coisa.'
      },
      {
        id: 'story-b1-3',
        prompt: 'Qual frase está no passado correto?',
        helper: 'Procure verbo regular com -ed.',
        choices: ['She watched a movie', 'She watch a movie', 'She watches yesterday', 'She watching a movie'],
        answer: 0,
        explain: '"Watched" é o passado regular de "watch".'
      },
      {
        id: 'story-b1-4',
        prompt: 'Complete: "I was tired, ___ I went home."',
        helper: 'Use conector de consequência.',
        choices: ['so', 'because', 'but', 'although'],
        answer: 0,
        explain: '"So" conecta causa e consequência.'
      }
    ]
  },
  {
    id: 'debates-b2',
    title: 'Debates e argumentos',
    level: 'B2',
    focus: 'Defender ideias, contrastar pontos e construir argumentos melhores.',
    xp: 85,
    questions: [
      {
        id: 'debate-b2-1',
        prompt: 'Qual expressão apresenta contraste?',
        helper: 'Use para comparar ideias opostas.',
        choices: ['On the other hand', 'At the same time yesterday', 'By the money', 'In the final table'],
        answer: 0,
        explain: '"On the other hand" introduz um ponto contrastante.'
      },
      {
        id: 'debate-b2-2',
        prompt: 'Complete: "The main argument ___ this idea is cost."',
        helper: 'Expressão para argumento contrário.',
        choices: ['against', 'under', 'between', 'during'],
        answer: 0,
        explain: '"Argument against" significa argumento contra algo.'
      },
      {
        id: 'debate-b2-3',
        prompt: 'O que "evidence" significa em uma discussão?',
        helper: 'Algo que apoia um argumento.',
        choices: ['Evidência', 'Opinião aleatória', 'Desculpa', 'Pergunta'],
        answer: 0,
        explain: '"Evidence" são fatos, dados ou exemplos que sustentam uma ideia.'
      },
      {
        id: 'debate-b2-4',
        prompt: 'Qual frase reconhece um ponto antes de discordar?',
        helper: 'Tom maduro em debate.',
        choices: ['That is a fair point, however...', 'No, you failed', 'I do not care', 'This is obviously false'],
        answer: 0,
        explain: '"That is a fair point, however..." reconhece o argumento e abre espaço para contraste.'
      }
    ]
  },
  {
    id: 'news-b2',
    title: 'Notícias e atualidades',
    level: 'B2',
    focus: 'Entender manchetes, causa, consequência e vocabulário de notícias.',
    xp: 80,
    questions: [
      {
        id: 'news-b2-1',
        prompt: 'O que "according to" significa?',
        helper: 'Muito usado para citar fonte.',
        choices: ['De acordo com', 'Apesar de', 'Em vez de', 'Perto de'],
        answer: 0,
        explain: '"According to" apresenta a fonte de uma informação.'
      },
      {
        id: 'news-b2-2',
        prompt: 'Complete: "The report was released ___ Monday."',
        helper: 'Dias da semana usam preposição específica.',
        choices: ['on', 'in', 'at', 'by always'],
        answer: 0,
        explain: 'Usamos "on" com dias da semana.'
      },
      {
        id: 'news-b2-3',
        prompt: 'Qual palavra indica aumento?',
        helper: 'Contexto de números em notícias.',
        choices: ['increase', 'drop', 'decline', 'fall'],
        answer: 0,
        explain: '"Increase" significa aumento.'
      },
      {
        id: 'news-b2-4',
        prompt: 'O que "due to" indica?',
        helper: 'Conecta causa.',
        choices: ['Por causa de', 'Apesar de', 'Antes de', 'Ao lado de'],
        answer: 0,
        explain: '"Due to" introduz a causa de algo.'
      }
    ]
  },
  {
    id: 'formal-writing-c1',
    title: 'Escrita formal',
    level: 'C1',
    focus: 'E-mails, clareza profissional e escolhas mais precisas.',
    xp: 90,
    questions: [
      {
        id: 'writing-c1-1',
        prompt: 'Qual abertura é mais adequada para um e-mail formal?',
        helper: 'Procure tom profissional.',
        choices: ['Dear Ms. Johnson,', 'Hey bro,', 'Yo Johnson,', 'Hiya boss,'],
        answer: 0,
        explain: '"Dear Ms. Johnson," é uma abertura formal e adequada.'
      },
      {
        id: 'writing-c1-2',
        prompt: 'Complete: "I would appreciate it if you could ___ the document."',
        helper: 'Pedido formal.',
        choices: ['review', 'see on', 'look me', 'watch to'],
        answer: 0,
        explain: '"Review the document" significa revisar o documento.'
      },
      {
        id: 'writing-c1-3',
        prompt: 'Qual frase soa mais profissional?',
        helper: 'Evite linguagem agressiva.',
        choices: ['Could you clarify this point?', 'Explain now', 'This makes no sense', 'You wrote wrong'],
        answer: 0,
        explain: '"Could you clarify this point?" pede explicação com respeito.'
      },
      {
        id: 'writing-c1-4',
        prompt: 'O que "regarding" significa em e-mails?',
        helper: 'Usado para introduzir assunto.',
        choices: ['Sobre', 'Apesar de', 'Antes de', 'Debaixo de'],
        answer: 0,
        explain: '"Regarding" significa "sobre" ou "em relação a".'
      }
    ]
  },
  {
    id: 'nuance-c1',
    title: 'Nuance e precisão',
    level: 'C1',
    focus: 'Diferenças sutis entre expressões parecidas.',
    xp: 95,
    questions: [
      {
        id: 'nuance-c1-1',
        prompt: 'Qual palavra indica uma possibilidade fraca?',
        helper: 'Mais fraca que "probably".',
        choices: ['possibly', 'certainly', 'definitely', 'undoubtedly'],
        answer: 0,
        explain: '"Possibly" indica possibilidade, mas com baixa certeza.'
      },
      {
        id: 'nuance-c1-2',
        prompt: 'O que "subtle difference" significa?',
        helper: 'Algo difícil de perceber.',
        choices: ['Diferença sutil', 'Diferença enorme', 'Erro óbvio', 'Resposta final'],
        answer: 0,
        explain: '"Subtle" descreve algo discreto ou pouco evidente.'
      },
      {
        id: 'nuance-c1-3',
        prompt: 'Complete: "His comment was technically correct, yet somewhat ___."',
        helper: 'Ideia de falta de sensibilidade.',
        choices: ['misleading', 'hungry', 'wooden', 'colorful'],
        answer: 0,
        explain: '"Misleading" significa enganoso ou que pode levar a uma interpretação errada.'
      },
      {
        id: 'nuance-c1-4',
        prompt: 'Qual frase expressa cautela ao afirmar algo?',
        helper: 'Tom analítico.',
        choices: ['It appears to be the case that...', 'It is 100% always true', 'No doubt ever', 'Everyone knows it'],
        answer: 0,
        explain: '"It appears to be..." sinaliza cuidado e evita uma afirmação absoluta.'
      }
    ]
  }
];
