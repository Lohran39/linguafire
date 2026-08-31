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

const baseLessonSets: LessonSet[] = [
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

const extraQuestionsByLesson: Record<string, LessonQuestion[]> = {
  'daily-basics': [
    {
      id: 'daily-5',
      prompt: 'Como dizer "Eu moro em São Paulo" em inglês?',
      helper: 'Use o verbo para falar onde você vive.',
      choices: ['I live in Sao Paulo', 'I am live Sao Paulo', 'I living in Sao Paulo', 'I stay at Sao Paulo'],
      answer: 0,
      explain: '"Live in" é usado para cidade, país ou região onde você mora.'
    },
    {
      id: 'daily-6',
      prompt: 'Complete: "They ___ my friends."',
      helper: 'Use o verbo to be com they.',
      choices: ['are', 'is', 'am', 'be'],
      answer: 0,
      explain: 'Com "they", o verbo to be correto é "are".'
    },
    {
      id: 'daily-7',
      prompt: 'O que significa "See you tomorrow"?',
      helper: 'Frase usada para despedida.',
      choices: ['Até amanhã', 'Bom dia', 'Vejo você agora', 'Como vai?'],
      answer: 0,
      explain: '"Tomorrow" significa amanhã, então a frase quer dizer "até amanhã".'
    },
    {
      id: 'daily-8',
      prompt: 'Qual frase pergunta a idade corretamente?',
      helper: 'Em inglês usamos verbo to be para idade.',
      choices: ['How old are you?', 'How many years you have?', 'What age you?', 'How age are you?'],
      answer: 0,
      explain: '"How old are you?" é a pergunta natural para idade.'
    },
    {
      id: 'daily-9',
      prompt: 'Complete: "I ___ English every day."',
      helper: 'Use presente simples para rotina.',
      choices: ['study', 'studies', 'studying', 'am study'],
      answer: 0,
      explain: 'Com "I", usamos o verbo base no presente simples: "I study".'
    },
    {
      id: 'daily-10',
      prompt: 'Como dizer "Estou cansado" em inglês?',
      helper: 'Use o verbo to be para estado físico.',
      choices: ['I am tired', 'I have tired', 'I tired', 'I do tired'],
      answer: 0,
      explain: '"Tired" descreve estado; por isso usamos "I am tired".'
    }
  ],
  'native-slang': [
    {
      id: 'slang-5',
      prompt: 'O que "Never mind" quer dizer?',
      helper: 'Usado quando você desiste de explicar algo.',
      choices: ['Deixa pra lá', 'Nunca pense', 'Lembre sempre', 'Está combinado'],
      answer: 0,
      explain: '"Never mind" cancela ou suaviza uma explicação: deixa pra lá.'
    },
    {
      id: 'slang-6',
      prompt: 'Complete: "That movie was ___!"',
      helper: 'Escolha uma palavra casual para algo muito bom.',
      choices: ['awesome', 'awful', 'late', 'empty'],
      answer: 0,
      explain: '"Awesome" é uma forma casual de dizer excelente ou muito legal.'
    },
    {
      id: 'slang-7',
      prompt: 'O que "I am broke" significa?',
      helper: 'Contexto de dinheiro.',
      choices: ['Estou sem dinheiro', 'Estou quebrado fisicamente', 'Estou atrasado', 'Estou ocupado'],
      answer: 0,
      explain: 'Na fala casual, "broke" significa sem dinheiro.'
    },
    {
      id: 'slang-8',
      prompt: 'Qual frase significa "relaxa"?',
      helper: 'Expressão curta em conversa informal.',
      choices: ['Take it easy', 'Take it hard', 'Make it heavy', 'Do it angry'],
      answer: 0,
      explain: '"Take it easy" pede calma ou sugere levar algo com leveza.'
    },
    {
      id: 'slang-9',
      prompt: 'O que "Sounds good" comunica?',
      helper: 'Resposta comum para aceitar uma ideia.',
      choices: ['Parece bom', 'Está barulhento', 'Fale mais alto', 'Não gostei'],
      answer: 0,
      explain: '"Sounds good" aprova uma proposta de forma natural.'
    },
    {
      id: 'slang-10',
      prompt: 'Complete: "I am just ___ around."',
      helper: 'Expressão para dizer que está brincando.',
      choices: ['messing', 'making', 'moving', 'meeting'],
      answer: 0,
      explain: '"Messing around" pode significar brincar ou não falar sério.'
    }
  ],
  'travel-ready': [
    {
      id: 'travel-5',
      prompt: 'Como perguntar "Onde fica o portão 12?"',
      helper: 'Aeroporto usa "gate".',
      choices: ['Where is gate twelve?', 'Who is gate twelve?', 'When gate twelve?', 'How gate twelve?'],
      answer: 0,
      explain: '"Gate" é portão de embarque; "Where is..." pergunta localização.'
    },
    {
      id: 'travel-6',
      prompt: 'Complete: "My flight is ___."',
      helper: 'Use a palavra para atraso.',
      choices: ['delayed', 'delay', 'lateful', 'waiting'],
      answer: 0,
      explain: '"Delayed" descreve um voo atrasado.'
    },
    {
      id: 'travel-7',
      prompt: 'O que "luggage" significa?',
      helper: 'Algo que você leva em viagem.',
      choices: ['Bagagem', 'Passagem', 'Escada', 'Reserva'],
      answer: 0,
      explain: '"Luggage" é bagagem; também se usa "baggage".'
    },
    {
      id: 'travel-8',
      prompt: 'Qual frase pede check-in no hotel?',
      helper: 'Frase direta na recepção.',
      choices: ['I would like to check in', 'I want to check out now', 'I am hotel', 'Give room me'],
      answer: 0,
      explain: '"Check in" é registrar entrada no hotel.'
    },
    {
      id: 'travel-9',
      prompt: 'Complete: "Is breakfast ___?"',
      helper: 'Pergunte se algo está incluso.',
      choices: ['included', 'inside', 'belonged', 'added in'],
      answer: 0,
      explain: '"Included" significa incluso.'
    },
    {
      id: 'travel-10',
      prompt: 'Como dizer "Perdi meu passaporte"?',
      helper: 'Use passado de lose.',
      choices: ['I lost my passport', 'I lose my passport yesterday', 'I missed my passport', 'I found my passport'],
      answer: 0,
      explain: '"Lost" é o passado de "lose" e serve para documentos perdidos.'
    }
  ],
  'business-talk': [
    {
      id: 'business-5',
      prompt: 'Como dizer "Podemos remarcar a reunião?"',
      helper: 'Use verbo comum para mudar horário.',
      choices: ['Can we reschedule the meeting?', 'Can we remake the meeting?', 'Can we redate meeting?', 'Can meeting move us?'],
      answer: 0,
      explain: '"Reschedule" significa remarcar para outro horário ou dia.'
    },
    {
      id: 'business-6',
      prompt: 'O que "brief overview" significa?',
      helper: 'Usado no começo de apresentações.',
      choices: ['Resumo breve', 'Revisão longa', 'Erro pequeno', 'Plano secreto'],
      answer: 0,
      explain: '"Brief" é breve e "overview" é visão geral.'
    },
    {
      id: 'business-7',
      prompt: 'Complete: "Could you send me the file ___ EOD?"',
      helper: 'EOD significa end of day.',
      choices: ['by', 'in', 'at', 'over'],
      answer: 0,
      explain: '"By EOD" quer dizer até o fim do dia.'
    },
    {
      id: 'business-8',
      prompt: 'Qual frase mostra prioridade alta?',
      helper: 'Contexto profissional.',
      choices: ['This is urgent', 'This is maybe later', 'This is sleepy', 'This is random'],
      answer: 0,
      explain: '"Urgent" indica que algo precisa de atenção rápida.'
    },
    {
      id: 'business-9',
      prompt: 'O que "stakeholder" significa?',
      helper: 'Pessoa afetada por um projeto.',
      choices: ['Parte interessada', 'Funcionário novo', 'Concorrente', 'Fornecedor de internet'],
      answer: 0,
      explain: '"Stakeholder" é quem tem interesse ou impacto em uma decisão.'
    },
    {
      id: 'business-10',
      prompt: 'Complete: "Let us align ___ the next steps."',
      helper: 'Use preposição comum com align.',
      choices: ['on', 'in', 'at', 'to'],
      answer: 0,
      explain: '"Align on" significa alinhar sobre um assunto ou próximos passos.'
    }
  ],
  'advanced-expression': [
    {
      id: 'advanced-5',
      prompt: 'O que "to take something for granted" significa?',
      helper: 'Expressão sobre não valorizar algo.',
      choices: ['Não dar valor a algo', 'Comprar algo caro', 'Aceitar um convite', 'Agradecer formalmente'],
      answer: 0,
      explain: '"Take for granted" indica tratar algo como garantido e não valorizar.'
    },
    {
      id: 'advanced-6',
      prompt: 'Complete: "Her argument rests on a flawed ___."',
      helper: 'Palavra para base lógica de argumento.',
      choices: ['assumption', 'assume', 'assuming', 'assumed'],
      answer: 0,
      explain: '"Assumption" é substantivo: uma suposição.'
    },
    {
      id: 'advanced-7',
      prompt: 'Qual frase indica concessão sofisticada?',
      helper: 'Use para admitir um ponto antes de contrastar.',
      choices: ['Granted, the data is limited', 'Yes data small very', 'Never data limited', 'Although yes no'],
      answer: 0,
      explain: '"Granted" pode introduzir concessão: admitindo que isso é verdade.'
    },
    {
      id: 'advanced-8',
      prompt: 'O que "counterproductive" significa?',
      helper: 'Algo que atrapalha o objetivo.',
      choices: ['Contraproducente', 'Muito produtivo', 'Obrigatório', 'Preciso'],
      answer: 0,
      explain: '"Counterproductive" descreve algo que produz o efeito contrário ao desejado.'
    },
    {
      id: 'advanced-9',
      prompt: 'Complete: "The policy may inadvertently ___ small businesses."',
      helper: 'Verbo para causar impacto negativo.',
      choices: ['harm', 'harmful', 'harming', 'harms to'],
      answer: 0,
      explain: 'Depois de "may", usamos o verbo base: "may harm".'
    },
    {
      id: 'advanced-10',
      prompt: 'O que "a double-edged sword" significa?',
      helper: 'Algo com benefício e risco.',
      choices: ['Algo com dois lados, bom e ruim', 'Uma espada real', 'Uma decisão simples', 'Um erro sem consequência'],
      answer: 0,
      explain: '"Double-edged sword" é algo que pode ajudar e prejudicar ao mesmo tempo.'
    }
  ],
  'phrasal-verbs': [
    {
      id: 'phrasal-5',
      prompt: 'O que "pick up" pode significar?',
      helper: 'Exemplo: "Can you pick me up?"',
      choices: ['Buscar alguém', 'Derrubar algo', 'Cancelar tudo', 'Dormir cedo'],
      answer: 0,
      explain: '"Pick up" pode significar buscar alguém de carro.'
    },
    {
      id: 'phrasal-6',
      prompt: 'Complete: "Please turn ___ the lights."',
      helper: 'Use para acender algo.',
      choices: ['on', 'up', 'over', 'away'],
      answer: 0,
      explain: '"Turn on" significa ligar ou acender.'
    },
    {
      id: 'phrasal-7',
      prompt: 'O que "run out of time" significa?',
      helper: 'Contexto de prazo.',
      choices: ['Ficar sem tempo', 'Correr no tempo', 'Ganhar tempo', 'Marcar horário'],
      answer: 0,
      explain: '"Run out of" indica que algo acabou.'
    },
    {
      id: 'phrasal-8',
      prompt: 'Qual frase usa "bring up" corretamente?',
      helper: 'Significa mencionar um assunto.',
      choices: ['She brought up a good point', 'She brought a point upstair', 'She bringed up good', 'She up brought point'],
      answer: 0,
      explain: '"Bring up" significa levantar ou mencionar um tópico.'
    },
    {
      id: 'phrasal-9',
      prompt: 'Complete: "I came ___ an old photo."',
      helper: 'Expressão para encontrar por acaso.',
      choices: ['across', 'away', 'down', 'off'],
      answer: 0,
      explain: '"Come across" significa encontrar algo sem procurar.'
    },
    {
      id: 'phrasal-10',
      prompt: 'O que "put off" significa?',
      helper: 'Exemplo: "Do not put it off."',
      choices: ['Adiar', 'Vestir', 'Publicar', 'Puxar'],
      answer: 0,
      explain: '"Put off" significa adiar uma tarefa ou decisão.'
    }
  ],
  'pronunciation-patterns': [
    {
      id: 'pron-5',
      prompt: '"Lemme" é forma reduzida de:',
      helper: 'Muito usado em fala casual.',
      choices: ['let me', 'leave me', 'lend me', 'learn me'],
      answer: 0,
      explain: '"Lemme" representa "let me" em fala rápida.'
    },
    {
      id: 'pron-6',
      prompt: '"Kinda" geralmente significa:',
      helper: 'Exemplo: "It is kinda hard."',
      choices: ['kind of', 'kind to', 'can do', 'came down'],
      answer: 0,
      explain: '"Kinda" vem de "kind of" e pode significar meio ou um pouco.'
    },
    {
      id: 'pron-7',
      prompt: 'Em fala rápida, "want to" pode soar como:',
      helper: 'Forma reduzida comum.',
      choices: ['wanna', 'wentcha', 'winto', 'won two'],
      answer: 0,
      explain: '"Want to" frequentemente vira "wanna" em fala informal.'
    },
    {
      id: 'pron-8',
      prompt: 'Qual palavra tem vogal longa em "ee"?',
      helper: 'Pense no som de "see".',
      choices: ['meet', 'met', 'mat', 'mud'],
      answer: 0,
      explain: '"Meet" tem som longo /i:/, parecido com "see".'
    },
    {
      id: 'pron-9',
      prompt: 'O som final de "worked" costuma ser:',
      helper: 'Verbo regular terminado em som sem voz.',
      choices: ['/t/', '/d/', '/id/', '/z/'],
      answer: 0,
      explain: 'Depois de som sem voz como /k/, o -ed soa /t/.'
    },
    {
      id: 'pron-10',
      prompt: 'Complete: "What are you" em fala rápida pode soar como ___.',
      helper: 'Contração casual muito comum.',
      choices: ['whatcha', 'wherecha', 'witcher', 'watch it'],
      answer: 0,
      explain: '"What are you" pode virar "whatcha" em fala bem informal.'
    }
  ],
  'confidence-builder': [
    {
      id: 'conf-5',
      prompt: 'Como dizer "Não entendi" de forma simples?',
      helper: 'Frase útil em qualquer conversa.',
      choices: ['I did not understand', 'I no understood', 'I not understanded', 'I am not understand'],
      answer: 0,
      explain: '"I did not understand" usa auxiliar did para passado negativo.'
    },
    {
      id: 'conf-6',
      prompt: 'Qual frase pede para falar mais devagar?',
      helper: 'Use quando o áudio estiver rápido.',
      choices: ['Could you speak more slowly?', 'Can you talk slowest?', 'Speak slow me', 'You slowly speak?'],
      answer: 0,
      explain: '"More slowly" é a forma correta para pedir menor velocidade.'
    },
    {
      id: 'conf-7',
      prompt: 'Complete: "How do you ___ this word?"',
      helper: 'Pergunta sobre pronúncia.',
      choices: ['pronounce', 'speak', 'tell', 'sound'],
      answer: 0,
      explain: '"Pronounce" é o verbo para pronunciar uma palavra.'
    },
    {
      id: 'conf-8',
      prompt: 'O que "What does it mean?" pergunta?',
      helper: 'Use quando você não sabe uma palavra.',
      choices: ['O que isso significa?', 'Onde isso fica?', 'Quanto custa?', 'Quem disse isso?'],
      answer: 0,
      explain: '"Mean" significa querer dizer ou significar.'
    },
    {
      id: 'conf-9',
      prompt: 'Como dizer "Só um momento"?',
      helper: 'Frase para ganhar tempo.',
      choices: ['Just a moment', 'Only one time', 'One little wait', 'Moment justly'],
      answer: 0,
      explain: '"Just a moment" é natural e educado.'
    },
    {
      id: 'conf-10',
      prompt: 'Complete: "Can you give me an ___?"',
      helper: 'Peça um exemplo.',
      choices: ['example', 'explain', 'exemplar', 'exampling'],
      answer: 0,
      explain: '"Example" é o substantivo correto para exemplo.'
    }
  ],
  'introductions-a1': [
    {
      id: 'intro-a1-5',
      prompt: 'Como dizer "Eu tenho 20 anos"?',
      helper: 'Em inglês usamos have para idade quando falamos a idade.',
      choices: ['I am 20 years old', 'I have 20 years', 'I do 20 years', 'I make 20 years'],
      answer: 0,
      explain: 'A forma natural é "I am 20 years old".'
    },
    {
      id: 'intro-a1-6',
      prompt: 'Complete: "This is ___ friend."',
      helper: 'Use possessivo de I.',
      choices: ['my', 'me', 'mine', 'I'],
      answer: 0,
      explain: '"My" vem antes de substantivo: "my friend".'
    },
    {
      id: 'intro-a1-7',
      prompt: 'O que significa "What is your name?"',
      helper: 'Pergunta básica de apresentação.',
      choices: ['Qual é o seu nome?', 'Onde você mora?', 'Como você está?', 'Qual sua idade?'],
      answer: 0,
      explain: '"Your name" significa seu nome.'
    },
    {
      id: 'intro-a1-8',
      prompt: 'Escolha a resposta natural para "How are you?"',
      helper: 'Cumprimento comum.',
      choices: ['I am fine, thanks', 'I have fine', 'I fine thanks', 'I am name'],
      answer: 0,
      explain: '"I am fine, thanks" responde como você está.'
    },
    {
      id: 'intro-a1-9',
      prompt: 'Complete: "He ___ a student."',
      helper: 'Use to be com he.',
      choices: ['is', 'are', 'am', 'be'],
      answer: 0,
      explain: 'Com "he", usamos "is".'
    },
    {
      id: 'intro-a1-10',
      prompt: 'Como dizer "Ela é minha irmã"?',
      helper: 'Use she + to be.',
      choices: ['She is my sister', 'She are my sister', 'Her is my sister', 'She my sister'],
      answer: 0,
      explain: '"She is my sister" junta sujeito, verbo e possessivo corretamente.'
    }
  ],
  'food-orders-a1': [
    {
      id: 'food-a1-5',
      prompt: 'Como pedir "sem açúcar"?',
      helper: 'Pedido comum para café ou chá.',
      choices: ['No sugar, please', 'Not sugar, please', 'Without sugars', 'Sugar no'],
      answer: 0,
      explain: '"No sugar, please" é simples e natural.'
    },
    {
      id: 'food-a1-6',
      prompt: 'Complete: "I am ___."',
      helper: 'Use para dizer que está com fome.',
      choices: ['hungry', 'hunger', 'food', 'eat'],
      answer: 0,
      explain: '"Hungry" é o adjetivo para com fome.'
    },
    {
      id: 'food-a1-7',
      prompt: 'O que significa "table for two"?',
      helper: 'Frase usada na entrada do restaurante.',
      choices: ['Mesa para duas pessoas', 'Dois pratos', 'Duas contas', 'Comida para dois dias'],
      answer: 0,
      explain: '"Table for two" pede uma mesa para duas pessoas.'
    },
    {
      id: 'food-a1-8',
      prompt: 'Qual frase pede água?',
      helper: 'Pedido educado.',
      choices: ['Can I have some water?', 'Can I am water?', 'Give water me', 'I water have?'],
      answer: 0,
      explain: '"Can I have..." é uma forma educada de pedir algo.'
    },
    {
      id: 'food-a1-9',
      prompt: 'Complete: "This food is ___."',
      helper: 'Use adjetivo positivo.',
      choices: ['delicious', 'eat', 'taste', 'cook'],
      answer: 0,
      explain: '"Delicious" significa delicioso.'
    },
    {
      id: 'food-a1-10',
      prompt: 'O que significa "takeout"?',
      helper: 'Comida para levar.',
      choices: ['Para viagem', 'Entrada grátis', 'Mesa reservada', 'Sobremesa'],
      answer: 0,
      explain: '"Takeout" é comida comprada para levar.'
    }
  ],
  'shopping-a2': [
    {
      id: 'shopping-a2-5',
      prompt: 'Como perguntar "Posso experimentar?"',
      helper: 'Contexto de roupa.',
      choices: ['Can I try it on?', 'Can I test it in?', 'Can I use it out?', 'Can I prove it?'],
      answer: 0,
      explain: '"Try it on" significa experimentar roupa ou sapato.'
    },
    {
      id: 'shopping-a2-6',
      prompt: 'O que "fitting room" significa?',
      helper: 'Lugar dentro de uma loja.',
      choices: ['Provador', 'Caixa', 'Estoque', 'Entrada'],
      answer: 0,
      explain: '"Fitting room" é o local para experimentar roupas.'
    },
    {
      id: 'shopping-a2-7',
      prompt: 'Complete: "Do you have this ___ blue?"',
      helper: 'Use preposição para cor.',
      choices: ['in', 'on', 'at', 'by'],
      answer: 0,
      explain: '"In blue" significa na cor azul.'
    },
    {
      id: 'shopping-a2-8',
      prompt: 'Qual frase pergunta o preço?',
      helper: 'Pergunta simples em loja.',
      choices: ['How much does it cost?', 'How many it cost?', 'What cost this?', 'How price is it?'],
      answer: 0,
      explain: '"How much does it cost?" é uma pergunta completa sobre preço.'
    },
    {
      id: 'shopping-a2-9',
      prompt: 'O que "sold out" significa?',
      helper: 'Produto indisponível.',
      choices: ['Esgotado', 'Com desconto', 'Muito caro', 'Novo'],
      answer: 0,
      explain: '"Sold out" indica que acabou no estoque.'
    },
    {
      id: 'shopping-a2-10',
      prompt: 'Complete: "Can I return ___ if it does not fit?"',
      helper: 'Use pronome para o produto.',
      choices: ['it', 'him', 'they', 'there'],
      answer: 0,
      explain: 'Para um objeto singular, usamos "it".'
    }
  ],
  'health-a2': [
    {
      id: 'health-a2-5',
      prompt: 'Como dizer "Estou doente"?',
      helper: 'Use adjetivo comum.',
      choices: ['I am sick', 'I have sick', 'I do sick', 'I sickness'],
      answer: 0,
      explain: '"Sick" é adjetivo; usamos "I am sick".'
    },
    {
      id: 'health-a2-6',
      prompt: 'O que "medicine" significa?',
      helper: 'Você toma quando está doente.',
      choices: ['Remédio', 'Médico', 'Consulta', 'Dor'],
      answer: 0,
      explain: '"Medicine" significa remédio ou medicamento.'
    },
    {
      id: 'health-a2-7',
      prompt: 'Complete: "I feel ___."',
      helper: 'Use adjetivo para mal-estar.',
      choices: ['dizzy', 'dizziness', 'doctor', 'hurted'],
      answer: 0,
      explain: '"Dizzy" significa tonto.'
    },
    {
      id: 'health-a2-8',
      prompt: 'Qual frase explica alergia?',
      helper: 'Contexto de atendimento médico.',
      choices: ['I am allergic to peanuts', 'I have allergy peanuts to', 'I am allergy by peanuts', 'Peanuts allergic me'],
      answer: 0,
      explain: 'A estrutura é "be allergic to" + coisa.'
    },
    {
      id: 'health-a2-9',
      prompt: 'O que "prescription" significa?',
      helper: 'Documento do médico para comprar remédio.',
      choices: ['Receita médica', 'Febre', 'Dor no peito', 'Consulta online'],
      answer: 0,
      explain: '"Prescription" é receita médica.'
    },
    {
      id: 'health-a2-10',
      prompt: 'Complete: "My stomach ___."',
      helper: 'Frase comum para dor.',
      choices: ['hurts', 'hurt', 'is hurt me', 'pain'],
      answer: 0,
      explain: '"Hurts" funciona como verbo: meu estômago dói.'
    }
  ],
  'opinions-b1': [
    {
      id: 'opinions-b1-5',
      prompt: 'Como dizer "Eu acho que depende"?',
      helper: 'Frase útil para opinião equilibrada.',
      choices: ['I think it depends', 'I think depends it', 'I depend that', 'It depends I thinked'],
      answer: 0,
      explain: '"It depends" significa depende; "I think" introduz opinião.'
    },
    {
      id: 'opinions-b1-6',
      prompt: 'O que "That makes sense" significa?',
      helper: 'Resposta quando algo parece lógico.',
      choices: ['Isso faz sentido', 'Isso faz som', 'Isso é caro', 'Isso está pronto'],
      answer: 0,
      explain: '"Makes sense" significa fazer sentido.'
    },
    {
      id: 'opinions-b1-7',
      prompt: 'Complete: "I am interested ___ learning English."',
      helper: 'Preposição correta depois de interested.',
      choices: ['in', 'on', 'at', 'for'],
      answer: 0,
      explain: 'A estrutura é "interested in" + substantivo ou verbo com -ing.'
    },
    {
      id: 'opinions-b1-8',
      prompt: 'Qual frase concorda parcialmente?',
      helper: 'Nem 100% sim, nem 100% não.',
      choices: ['I partly agree', 'I all agree no', 'I agree nothing', 'I halfly yes'],
      answer: 0,
      explain: '"Partly agree" significa concordar em parte.'
    },
    {
      id: 'opinions-b1-9',
      prompt: 'O que "from my perspective" significa?',
      helper: 'Forma de apresentar ponto de vista.',
      choices: ['Do meu ponto de vista', 'Da minha janela', 'Pelo meu preço', 'Desde minha idade'],
      answer: 0,
      explain: '"Perspective" aqui significa ponto de vista.'
    },
    {
      id: 'opinions-b1-10',
      prompt: 'Complete: "I would rather stay home ___ go out."',
      helper: 'Estrutura de preferência.',
      choices: ['than', 'to', 'from', 'that'],
      answer: 0,
      explain: '"Would rather X than Y" expressa preferência entre duas ações.'
    }
  ],
  'storytelling-b1': [
    {
      id: 'story-b1-5',
      prompt: 'Complete: "While I was cooking, my phone ___."',
      helper: 'Ação curta interrompe uma ação em progresso.',
      choices: ['rang', 'ring', 'rung', 'was ring'],
      answer: 0,
      explain: '"Rang" é o passado de "ring".'
    },
    {
      id: 'story-b1-6',
      prompt: 'O que "suddenly" adiciona a uma história?',
      helper: 'Marca surpresa.',
      choices: ['Algo aconteceu de repente', 'Algo demorou muito', 'Algo foi repetido', 'Algo foi planejado'],
      answer: 0,
      explain: '"Suddenly" indica uma mudança inesperada ou rápida.'
    },
    {
      id: 'story-b1-7',
      prompt: 'Qual frase usa passado contínuo corretamente?',
      helper: 'Use was/were + verbo com -ing.',
      choices: ['They were talking', 'They was talking', 'They talking were', 'They talked were'],
      answer: 0,
      explain: 'Com "they", usamos "were" + verbo com -ing.'
    },
    {
      id: 'story-b1-8',
      prompt: 'Complete: "After that, we ___ dinner."',
      helper: 'Use passado de have.',
      choices: ['had', 'have', 'has', 'having'],
      answer: 0,
      explain: '"Had" é o passado de "have".'
    },
    {
      id: 'story-b1-9',
      prompt: 'O que "eventually" significa?',
      helper: 'Mostra resultado depois de algum tempo.',
      choices: ['Finalmente / depois de um tempo', 'Eventualmente no sentido de talvez', 'Rapidamente', 'Nunca'],
      answer: 0,
      explain: '"Eventually" significa finalmente ou depois de um processo.'
    },
    {
      id: 'story-b1-10',
      prompt: 'Qual frase conecta causa?',
      helper: 'Explique por que algo aconteceu.',
      choices: ['I left because I was tired', 'I left but I was tired cause', 'Because left I tired', 'I tired so because left'],
      answer: 0,
      explain: '"Because" introduz a causa de uma ação.'
    }
  ],
  'debates-b2': [
    {
      id: 'debate-b2-5',
      prompt: 'Complete: "I would argue ___ this approach is risky."',
      helper: 'Estrutura para defender uma ideia.',
      choices: ['that', 'what', 'which', 'because of'],
      answer: 0,
      explain: '"Argue that" introduz uma afirmação defendida por argumento.'
    },
    {
      id: 'debate-b2-6',
      prompt: 'O que "trade-off" significa?',
      helper: 'Decisão com ganho e perda.',
      choices: ['Compensação entre vantagens e desvantagens', 'Troca de produto', 'Contrato de venda', 'Erro de cálculo'],
      answer: 0,
      explain: '"Trade-off" é quando ganhar algo implica abrir mão de outra coisa.'
    },
    {
      id: 'debate-b2-7',
      prompt: 'Qual frase introduz uma ressalva?',
      helper: 'Use para limitar uma afirmação.',
      choices: ['That said, there are risks', 'Everything is perfect always', 'No risks exist', 'This ends debate'],
      answer: 0,
      explain: '"That said" introduz contraste ou ressalva.'
    },
    {
      id: 'debate-b2-8',
      prompt: 'Complete: "This point is relevant ___ it changes the outcome."',
      helper: 'Explique motivo.',
      choices: ['because', 'despite', 'unless', 'whereas'],
      answer: 0,
      explain: '"Because" liga a relevância ao motivo.'
    },
    {
      id: 'debate-b2-9',
      prompt: 'O que "to challenge an assumption" significa?',
      helper: 'Contexto de debate crítico.',
      choices: ['Questionar uma suposição', 'Aceitar uma regra', 'Criar uma desculpa', 'Evitar uma pergunta'],
      answer: 0,
      explain: '"Challenge" aqui significa questionar ou colocar à prova.'
    },
    {
      id: 'debate-b2-10',
      prompt: 'Qual expressão conclui um argumento?',
      helper: 'Fechamento lógico.',
      choices: ['Therefore', 'Meanwhile', 'Unless', 'Wherever'],
      answer: 0,
      explain: '"Therefore" significa portanto e conecta conclusão.'
    }
  ],
  'news-b2': [
    {
      id: 'news-b2-5',
      prompt: 'O que "breaking news" significa?',
      helper: 'Usado para notícia urgente.',
      choices: ['Notícia de última hora', 'Notícia quebrada', 'Erro no jornal', 'Previsão antiga'],
      answer: 0,
      explain: '"Breaking news" é notícia urgente ou recém-divulgada.'
    },
    {
      id: 'news-b2-6',
      prompt: 'Complete: "The company announced a ___ in prices."',
      helper: 'Use palavra para queda.',
      choices: ['drop', 'grow', 'rise up', 'high'],
      answer: 0,
      explain: '"Drop" é queda ou redução.'
    },
    {
      id: 'news-b2-7',
      prompt: 'Qual palavra indica fonte anônima?',
      helper: 'Muito comum em reportagens.',
      choices: ['source', 'sauce', 'resourceful', 'originated'],
      answer: 0,
      explain: '"Source" é fonte de informação.'
    },
    {
      id: 'news-b2-8',
      prompt: 'O que "lawmakers" significa?',
      helper: 'Pessoas que criam leis.',
      choices: ['Legisladores', 'Advogados privados', 'Juízes', 'Eleitores'],
      answer: 0,
      explain: '"Lawmakers" são pessoas que fazem leis.'
    },
    {
      id: 'news-b2-9',
      prompt: 'Complete: "The decision sparked ___ online."',
      helper: 'Reação pública forte.',
      choices: ['debate', 'sleep', 'weather', 'silence only'],
      answer: 0,
      explain: '"Sparked debate" significa provocou debate.'
    },
    {
      id: 'news-b2-10',
      prompt: 'O que "to face criticism" significa?',
      helper: 'Quando alguém recebe críticas.',
      choices: ['Enfrentar críticas', 'Evitar notícias', 'Publicar elogios', 'Mudar de rosto'],
      answer: 0,
      explain: '"Face criticism" significa receber ou enfrentar críticas.'
    }
  ],
  'formal-writing-c1': [
    {
      id: 'writing-c1-5',
      prompt: 'Complete: "Please find ___ the revised proposal."',
      helper: 'Expressão formal de anexo.',
      choices: ['attached', 'attaching', 'attach', 'attachmented'],
      answer: 0,
      explain: '"Please find attached..." é fórmula comum para anexos.'
    },
    {
      id: 'writing-c1-6',
      prompt: 'Qual frase encerra um e-mail formal?',
      helper: 'Fechamento profissional.',
      choices: ['Kind regards,', 'Bye bro,', 'See ya,', 'Later!'],
      answer: 0,
      explain: '"Kind regards" é educado e profissional.'
    },
    {
      id: 'writing-c1-7',
      prompt: 'O que "at your earliest convenience" significa?',
      helper: 'Pedido educado sem prazo exato.',
      choices: ['Assim que for conveniente', 'Agora imediatamente', 'No horário mais tarde', 'Quando eu mandar'],
      answer: 0,
      explain: 'A expressão pede algo de forma educada quando a pessoa puder.'
    },
    {
      id: 'writing-c1-8',
      prompt: 'Complete: "I am writing to ___ about the invoice."',
      helper: 'Verbo formal para perguntar.',
      choices: ['inquire', 'ask to', 'questionate', 'doubt'],
      answer: 0,
      explain: '"Inquire about" significa consultar ou perguntar formalmente sobre algo.'
    },
    {
      id: 'writing-c1-9',
      prompt: 'Qual frase é mais concisa e profissional?',
      helper: 'Evite excesso de palavras.',
      choices: ['Please confirm receipt', 'Please say that you did receive this thing', 'Tell me you got it now', 'Confirm me receiving'],
      answer: 0,
      explain: '"Please confirm receipt" é curto e comum em contexto profissional.'
    },
    {
      id: 'writing-c1-10',
      prompt: 'O que "to reiterate" significa?',
      helper: 'Usado para reforçar uma ideia já dita.',
      choices: ['Reiterar / repetir para reforçar', 'Apagar', 'Contradizer', 'Responder com atraso'],
      answer: 0,
      explain: '"Reiterate" significa afirmar novamente para dar ênfase.'
    }
  ],
  'nuance-c1': [
    {
      id: 'nuance-c1-5',
      prompt: 'Qual opção é mais cautelosa que "definitely"?',
      helper: 'Procure menor certeza.',
      choices: ['presumably', 'absolutely', 'undeniably', 'certainly'],
      answer: 0,
      explain: '"Presumably" indica suposição provável, não certeza absoluta.'
    },
    {
      id: 'nuance-c1-6',
      prompt: 'O que "arguably" comunica?',
      helper: 'Usado antes de opinião defensável.',
      choices: ['Pode-se argumentar que', 'Sem dúvida nenhuma', 'De forma ilegal', 'Por acidente'],
      answer: 0,
      explain: '"Arguably" mostra que uma afirmação pode ser defendida, mas não é absoluta.'
    },
    {
      id: 'nuance-c1-7',
      prompt: 'Complete: "The proposal is viable, albeit ___."',
      helper: 'Albeit introduz uma limitação.',
      choices: ['costly', 'cost', 'costing by', 'costed'],
      answer: 0,
      explain: '"Albeit costly" significa embora seja caro.'
    },
    {
      id: 'nuance-c1-8',
      prompt: 'Qual frase evita generalização exagerada?',
      helper: 'Tom preciso.',
      choices: ['In many cases, this works', 'This always works for everyone', 'Nobody ever fails this', 'It is impossible to disagree'],
      answer: 0,
      explain: '"In many cases" limita o alcance da afirmação.'
    },
    {
      id: 'nuance-c1-9',
      prompt: 'O que "to overlook a detail" significa?',
      helper: 'Algo passou despercebido.',
      choices: ['Deixar um detalhe passar', 'Olhar por cima de uma cidade', 'Explicar bem um detalhe', 'Aumentar um detalhe'],
      answer: 0,
      explain: '"Overlook" pode significar não perceber algo importante.'
    },
    {
      id: 'nuance-c1-10',
      prompt: 'Complete: "The distinction is ___ but important."',
      helper: 'Algo pequeno, mas relevante.',
      choices: ['subtle', 'loud', 'obviousness', 'heavy'],
      answer: 0,
      explain: '"Subtle but important" descreve uma diferença discreta, porém relevante.'
    }
  ]
};

export const lessonSets: LessonSet[] = baseLessonSets.map((lesson) => ({
  ...lesson,
  questions: [...lesson.questions, ...(extraQuestionsByLesson[lesson.id] || [])]
}));
