import type { LessonSet } from './lessons';

export const additionalLessons: LessonSet[] = [
  {
    "id": "home-a1",
    "title": "Minha casa",
    "level": "A1",
    "focus": "Objetos, localização e descrição de cômodos.",
    "xp": 50,
    "questions": [
      {
        "id": "home-a1-1",
        "prompt": "Complete: \"There ___ a table in the kitchen.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "is",
          "are",
          "am",
          "be"
        ],
        "answer": 0,
        "explain": "Use \"there is\" para indicar a existência de uma coisa no singular."
      },
      {
        "id": "home-a1-2",
        "prompt": "As chaves estão embaixo da cadeira. Complete: \"The keys are ___ the chair.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "between",
          "under",
          "on",
          "in"
        ],
        "answer": 1,
        "explain": "\"Under\" significa embaixo; \"on\" indica sobre uma superfície."
      },
      {
        "id": "home-a1-3",
        "prompt": "Qual palavra completa \"I sleep in my ___\"?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "bathroom",
          "garden",
          "bedroom",
          "kitchen"
        ],
        "answer": 2,
        "explain": "\"Bedroom\" é o quarto onde se dorme."
      },
      {
        "id": "home-a1-4",
        "prompt": "Você quer saber se alguém tem uma mesa. Qual pergunta usa o presente simples corretamente?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Does you have a desk?",
          "Do you has a desk?",
          "Are you have a desk?",
          "Do you have a desk?"
        ],
        "answer": 3,
        "explain": "Com \"you\", use \"do\" e o verbo principal na forma base: \"have\"."
      },
      {
        "id": "home-a1-5",
        "prompt": "Você aponta para duas janelas próximas. Complete: \"___ windows are open.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "These",
          "This",
          "That",
          "It"
        ],
        "answer": 0,
        "explain": "\"These\" acompanha um substantivo plural próximo de quem fala."
      }
    ]
  },
  {
    "id": "schedule-a1",
    "title": "Horários e rotina",
    "level": "A1",
    "focus": "Dias, horas e hábitos simples.",
    "xp": 50,
    "questions": [
      {
        "id": "schedule-a1-1",
        "prompt": "Complete: \"I get up ___ seven o’clock.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "at",
          "on",
          "in",
          "to"
        ],
        "answer": 0,
        "explain": "Use \"at\" antes de uma hora específica."
      },
      {
        "id": "schedule-a1-2",
        "prompt": "Complete: \"She ___ English every day.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "studys",
          "studies",
          "study",
          "studying"
        ],
        "answer": 1,
        "explain": "No presente simples, \"study\" vira \"studies\" com she/he/it."
      },
      {
        "id": "schedule-a1-3",
        "prompt": "\"The class starts at half past nine.\" A aula começa às:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "8h30",
          "10h30",
          "9h30",
          "9h15"
        ],
        "answer": 2,
        "explain": "\"Half past nine\" significa meia hora depois das nove."
      },
      {
        "id": "schedule-a1-4",
        "prompt": "Complete: \"We don’t ___ on Sundays.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "works",
          "working",
          "worked",
          "work"
        ],
        "answer": 3,
        "explain": "Depois de \"don’t\", use a forma base do verbo."
      },
      {
        "id": "schedule-a1-5",
        "prompt": "Complete: \"My lesson is ___ Monday.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "on",
          "at",
          "in",
          "of"
        ],
        "answer": 0,
        "explain": "Use \"on\" com dias da semana."
      }
    ]
  },
  {
    "id": "weekend-a2",
    "title": "Meu último fim de semana",
    "level": "A2",
    "focus": "Passado simples e sequência de acontecimentos.",
    "xp": 50,
    "questions": [
      {
        "id": "weekend-a2-1",
        "prompt": "Complete: \"Yesterday, we ___ to the park.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "went",
          "go",
          "going",
          "goed"
        ],
        "answer": 0,
        "explain": "\"Went\" é o passado irregular de \"go\"."
      },
      {
        "id": "weekend-a2-2",
        "prompt": "Complete: \"Did you ___ the film last night?\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "watches",
          "watch",
          "watched",
          "watching"
        ],
        "answer": 1,
        "explain": "\"Did\" já marca o passado; o verbo principal fica na forma base."
      },
      {
        "id": "weekend-a2-3",
        "prompt": "Complete: \"I didn’t ___ any photos.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "taken",
          "taking",
          "take",
          "took"
        ],
        "answer": 2,
        "explain": "Use \"didn’t take\". \"Took\" é usado em afirmações no passado."
      },
      {
        "id": "weekend-a2-4",
        "prompt": "Complete: \"First we had lunch. ___, we visited the museum.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Because",
          "Although",
          "Until",
          "Then"
        ],
        "answer": 3,
        "explain": "\"Then\" apresenta a próxima ação de uma sequência."
      },
      {
        "id": "weekend-a2-5",
        "prompt": "\"I stayed home because it was raining.\" Por que a pessoa ficou em casa?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Porque estava chovendo",
          "Porque estava cansada",
          "Porque o museu fechou",
          "Porque era tarde"
        ],
        "answer": 0,
        "explain": "\"Because\" introduz a causa; \"it was raining\" significa estava chovendo."
      }
    ]
  },
  {
    "id": "transport-a2",
    "title": "Pela cidade",
    "level": "A2",
    "focus": "Transporte, direções e comparação de opções.",
    "xp": 50,
    "questions": [
      {
        "id": "transport-a2-1",
        "prompt": "Você quer chegar à estação. Qual pergunta expressa esse objetivo?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "How do I get to the station?",
          "How much is the ticket?",
          "What time is it?",
          "Where do you work?"
        ],
        "answer": 0,
        "explain": "\"How do I get to…?\" pede instruções para chegar a um lugar."
      },
      {
        "id": "transport-a2-2",
        "prompt": "Complete: \"The bus is ___ than a taxi.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "more cheap",
          "cheaper",
          "cheap",
          "cheapest"
        ],
        "answer": 1,
        "explain": "O comparativo de \"cheap\" é \"cheaper\"; \"than\" introduz a comparação."
      },
      {
        "id": "transport-a2-3",
        "prompt": "\"Get off at the next stop.\" O que você deve fazer?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Comprar outra passagem",
          "Voltar à primeira parada",
          "Descer na próxima parada",
          "Entrar no próximo ônibus"
        ],
        "answer": 2,
        "explain": "\"Get off\" é usado para sair de ônibus ou trem."
      },
      {
        "id": "transport-a2-4",
        "prompt": "Complete: \"Go straight ahead and turn right ___ the traffic lights.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "under",
          "between",
          "through",
          "at"
        ],
        "answer": 3,
        "explain": "\"At the traffic lights\" indica o ponto de referência para virar."
      },
      {
        "id": "transport-a2-5",
        "prompt": "Complete: \"How ___ does the journey take?\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "long",
          "many",
          "far",
          "often"
        ],
        "answer": 0,
        "explain": "\"How long\" pergunta duração; \"how far\" pergunta distância."
      }
    ]
  },
  {
    "id": "digital-b1",
    "title": "Vida digital",
    "level": "B1",
    "focus": "Problemas técnicos e instruções cotidianas.",
    "xp": 50,
    "questions": [
      {
        "id": "digital-b1-1",
        "prompt": "\"Please back up your files before updating.\" Qual é a instrução?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Fazer uma cópia de segurança",
          "Apagar os arquivos",
          "Imprimir os arquivos",
          "Fechar a conta"
        ],
        "answer": 0,
        "explain": "\"Back up\" significa criar uma cópia para proteger dados."
      },
      {
        "id": "digital-b1-2",
        "prompt": "Complete: \"If the app freezes, ___ it.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "restarts",
          "restart",
          "restarted",
          "restarting"
        ],
        "answer": 1,
        "explain": "Aqui, a oração com \"if\" apresenta a condição e o imperativo dá a instrução."
      },
      {
        "id": "digital-b1-3",
        "prompt": "\"I’ve forgotten my password.\" O que a pessoa precisa recuperar?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "O nome do arquivo",
          "O endereço da loja",
          "A senha",
          "O carregador"
        ],
        "answer": 2,
        "explain": "\"Password\" é senha; o present perfect liga o esquecimento ao problema atual."
      },
      {
        "id": "digital-b1-4",
        "prompt": "Complete: \"The file is too large ___ by email.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "sending",
          "send",
          "for send",
          "to send"
        ],
        "answer": 3,
        "explain": "A estrutura \"too + adjetivo + to + verbo\" indica que algo impede uma ação."
      },
      {
        "id": "digital-b1-5",
        "prompt": "Você quer perguntar se alguém já tentou reiniciar o aparelho. Escolha a frase correta.",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Have you tried restarting it?",
          "Have you try restarting it?",
          "Did you tried restarting it?",
          "Do you tried restarting it?"
        ],
        "answer": 0,
        "explain": "Depois de \"have you\", use o particípio \"tried\". \"Try doing\" sugere testar uma solução."
      }
    ]
  },
  {
    "id": "plans-b1",
    "title": "Planos e possibilidades",
    "level": "B1",
    "focus": "Condições reais, sugestões e compromissos.",
    "xp": 50,
    "questions": [
      {
        "id": "plans-b1-1",
        "prompt": "Complete: \"If it rains tomorrow, we ___ at home.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "will stay",
          "would stayed",
          "stayed",
          "staying"
        ],
        "answer": 0,
        "explain": "Uma condição futura possível pode usar \"if + presente\" e \"will + verbo\"."
      },
      {
        "id": "plans-b1-2",
        "prompt": "Complete: \"Why don’t we ___ the earlier train?\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "took",
          "take",
          "taking",
          "takes"
        ],
        "answer": 1,
        "explain": "\"Why don’t we + verbo base\" apresenta uma sugestão."
      },
      {
        "id": "plans-b1-3",
        "prompt": "\"I might join you later.\" A pessoa:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Recusou definitivamente",
          "Exigiu que todos esperem",
          "Talvez participe mais tarde",
          "Confirmou que já chegou"
        ],
        "answer": 2,
        "explain": "\"Might\" expressa possibilidade, sem confirmar o plano."
      },
      {
        "id": "plans-b1-4",
        "prompt": "Complete: \"We’re looking forward to ___ you.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "see",
          "saw",
          "seen",
          "seeing"
        ],
        "answer": 3,
        "explain": "Em \"look forward to\", \"to\" é preposição e pode ser seguido de verbo com -ing."
      },
      {
        "id": "plans-b1-5",
        "prompt": "\"Can we put off the meeting until Friday?\" A pessoa quer:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Adiar a reunião para sexta",
          "Cancelar a reunião para sempre",
          "Antecipar a reunião para hoje",
          "Encerrar a reunião agora"
        ],
        "answer": 0,
        "explain": "\"Put off\" significa adiar; \"until Friday\" informa a nova referência de tempo."
      }
    ]
  },
  {
    "id": "feedback-b2",
    "title": "Feedback e negociação",
    "level": "B2",
    "focus": "Sugestões profissionais e discordância respeitosa.",
    "xp": 50,
    "questions": [
      {
        "id": "feedback-b2-1",
        "prompt": "Você quer discordar e reconhecer o ponto do colega. Qual frase faz isso?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "I see your point, but I have a concern.",
          "Your point is completely worthless.",
          "I agree with every detail.",
          "There is nothing to discuss."
        ],
        "answer": 0,
        "explain": "A frase reconhece a opinião antes de introduzir uma preocupação."
      },
      {
        "id": "feedback-b2-2",
        "prompt": "Complete: \"I would suggest ___ the deadline.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "extended",
          "extending",
          "to extend",
          "extend"
        ],
        "answer": 1,
        "explain": "\"Suggest\" pode ser seguido de verbo com -ing: \"suggest extending\"."
      },
      {
        "id": "feedback-b2-3",
        "prompt": "\"We need to meet halfway.\" Neste acordo, isso significa:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "A reunião já terminou",
          "Um lado aceita todas as exigências",
          "Cada lado deve ceder um pouco",
          "Todos devem viajar ao centro"
        ],
        "answer": 2,
        "explain": "\"Meet halfway\" pode expressar a busca por um meio-termo."
      },
      {
        "id": "feedback-b2-4",
        "prompt": "Complete: \"The deadline is tight; ___, we can still deliver.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "therefore",
          "because",
          "for example",
          "however"
        ],
        "answer": 3,
        "explain": "\"However\" contrasta a dificuldade com a possibilidade de entregar."
      },
      {
        "id": "feedback-b2-5",
        "prompt": "Complete: \"Had we known earlier, we ___ the schedule.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "would have changed",
          "will change",
          "would changing",
          "have change"
        ],
        "answer": 0,
        "explain": "A inversão \"Had we known\" equivale a \"If we had known\" e apresenta uma condição passada irreal."
      }
    ]
  },
  {
    "id": "media-b2",
    "title": "Lendo informações com cuidado",
    "level": "B2",
    "focus": "Fonte, evidência e diferença entre fato e interpretação.",
    "xp": 50,
    "questions": [
      {
        "id": "media-b2-1",
        "prompt": "\"According to the report, sales fell by 8%.\" A expressão inicial indica:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "A fonte da informação",
          "A opinião de todos os leitores",
          "Uma garantia de precisão absoluta",
          "A causa da queda"
        ],
        "answer": 0,
        "explain": "\"According to\" atribui a informação a uma fonte; não garante que ela esteja correta."
      },
      {
        "id": "media-b2-2",
        "prompt": "Complete: \"The claim has not ___ confirmed.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "was",
          "been",
          "being",
          "be"
        ],
        "answer": 1,
        "explain": "A voz passiva no present perfect usa \"has/have been + particípio\"."
      },
      {
        "id": "media-b2-3",
        "prompt": "\"The results suggest a connection.\" O verbo \"suggest\" comunica:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Uma ordem de investigação",
          "Uma negação completa",
          "Uma indicação que não é prova definitiva",
          "Uma certeza sem exceções"
        ],
        "answer": 2,
        "explain": "Nesse contexto, \"suggest\" indica uma interpretação cautelosa dos resultados."
      },
      {
        "id": "media-b2-4",
        "prompt": "Qual título apresenta uma opinião explícita?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "The film opens on Friday",
          "The film lasts 120 minutes",
          "The director attended the premiere",
          "The best film of the year"
        ],
        "answer": 3,
        "explain": "\"Best\" é uma avaliação; as outras opções apresentam informações verificáveis."
      },
      {
        "id": "media-b2-5",
        "prompt": "Complete: \"Despite ___ limited data, the team published its findings.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "having",
          "have",
          "had",
          "to have"
        ],
        "answer": 0,
        "explain": "\"Despite\" pode ser seguido de um substantivo ou de verbo com -ing."
      }
    ]
  },
  {
    "id": "research-c1",
    "title": "Evidências e ressalvas",
    "level": "C1",
    "focus": "Limites de conclusões e precisão na argumentação.",
    "xp": 50,
    "questions": [
      {
        "id": "research-c1-1",
        "prompt": "\"The findings are consistent with the hypothesis.\" Isso significa que os resultados:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "São compatíveis com a hipótese",
          "Provam a hipótese em qualquer contexto",
          "Contradizem necessariamente a hipótese",
          "Eliminam a necessidade de novos estudos"
        ],
        "answer": 0,
        "explain": "Ser compatível com uma hipótese não equivale a demonstrá-la de forma definitiva."
      },
      {
        "id": "research-c1-2",
        "prompt": "Complete: \"These conclusions should be treated with ___.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "absence",
          "caution",
          "certainty",
          "permission"
        ],
        "answer": 1,
        "explain": "\"Treat with caution\" recomenda cuidado ao interpretar ou aplicar conclusões."
      },
      {
        "id": "research-c1-3",
        "prompt": "\"The sample was not representative.\" Qual limitação é apontada?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Os participantes não responderam em voz alta",
          "Os resultados foram necessariamente inventados",
          "O grupo não refletia adequadamente a população estudada",
          "A pesquisa não tinha título"
        ],
        "answer": 2,
        "explain": "Uma amostra não representativa limita a generalização dos resultados."
      },
      {
        "id": "research-c1-4",
        "prompt": "Complete: \"Not only ___ the estimate inaccurate, but it was also outdated.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "it was",
          "did",
          "has",
          "was"
        ],
        "answer": 3,
        "explain": "\"Not only\" no início dessa estrutura pede inversão: \"was the estimate\"."
      },
      {
        "id": "research-c1-5",
        "prompt": "\"This is a tentative explanation.\" A explicação é:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Provisória e sujeita a revisão",
          "Definitiva e incontestável",
          "Intencionalmente enganosa",
          "Uma instrução obrigatória"
        ],
        "answer": 0,
        "explain": "\"Tentative\" descreve algo ainda não estabelecido de forma firme."
      }
    ]
  },
  {
    "id": "diplomacy-c1",
    "title": "Diplomacia e subtexto",
    "level": "C1",
    "focus": "Discordância, condições e grau de comprometimento.",
    "xp": 50,
    "questions": [
      {
        "id": "diplomacy-c1-1",
        "prompt": "\"I wouldn’t go so far as to call it a failure.\" O falante:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Evita uma avaliação tão negativa",
          "Afirma que foi um fracasso absoluto",
          "Diz que o projeto não começou",
          "Garante que tudo foi perfeito"
        ],
        "answer": 0,
        "explain": "\"Wouldn’t go so far as to\" limita a intensidade da avaliação."
      },
      {
        "id": "diplomacy-c1-2",
        "prompt": "Complete: \"We can proceed, provided that everyone ___ to the terms.\"",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "have agreed",
          "agrees",
          "agreeing",
          "to agree"
        ],
        "answer": 1,
        "explain": "\"Provided that\" estabelece uma condição; \"everyone\" exige \"agrees\" no presente."
      },
      {
        "id": "diplomacy-c1-3",
        "prompt": "\"With all due respect, I disagree.\" A expressão inicial:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Demonstra concordância total",
          "Serve apenas para agradecer",
          "Marca uma discordância que pretende ser respeitosa",
          "Elimina qualquer possibilidade de conflito"
        ],
        "answer": 2,
        "explain": "A expressão sinaliza respeito, mas o tom e o contexto ainda podem torná-la confrontadora."
      },
      {
        "id": "diplomacy-c1-4",
        "prompt": "\"The proposal leaves much to be desired.\" O falante considera a proposta:",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "Excelente em todos os aspectos",
          "Aprovada sem alterações",
          "Irrelevante por ser antiga",
          "Insatisfatória"
        ],
        "answer": 3,
        "explain": "\"Leave much to be desired\" é uma avaliação negativa: há muito a melhorar."
      },
      {
        "id": "diplomacy-c1-5",
        "prompt": "Qual resposta aceita estudar uma ideia sem prometer implementá-la?",
        "helper": "Leia a situação e escolha a alternativa que combina com o contexto.",
        "choices": [
          "We’re open to exploring that option.",
          "We guarantee it will be implemented.",
          "We have already implemented it.",
          "We will never consider it."
        ],
        "answer": 0,
        "explain": "Estar aberto a explorar uma opção não significa assumir compromisso de execução."
      }
    ]
  }
];
