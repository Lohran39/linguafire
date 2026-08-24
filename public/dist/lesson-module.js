// ==================== LIÇÕES, PERGUNTAS E KARAOKÊ ====================
(function initLessonModule(window){
  'use strict';

  function shuffleArray(items){
    const shuffled=[...(items || [])];
    for(let index=shuffled.length-1;index>0;index-=1){
      const swapIndex=Math.floor(Math.random()*(index+1));
      [shuffled[index],shuffled[swapIndex]]=[shuffled[swapIndex],shuffled[index]];
    }
    return shuffled;
  }

  function normalizeAnswerText(value=''){
    return String(value).toLowerCase().trim().replace(/\s+/g,' ');
  }

  function cloneQuestion(question){
    return {
      ...question,
      choices:Array.isArray(question.choices) ? [...question.choices] : question.choices,
      words:Array.isArray(question.words) ? [...question.words] : question.words,
      acceptAll:Array.isArray(question.acceptAll) ? [...question.acceptAll] : question.acceptAll,
      lyrics:Array.isArray(question.lyrics) ? question.lyrics.map(line=>({...line})) : question.lyrics
    };
  }

  function prepareChoiceQuestion(question){
    if(question.type!=='choice' || !Array.isArray(question.choices) || question.choices.length<2){
      return question;
    }

    const originalChoices=[...question.choices];
    const originalCorrectIndex=Number.isInteger(question.correct) ? question.correct : 0;
    const correctAnswer=typeof question.answer==='string' && originalChoices.some(choice=>normalizeAnswerText(choice)===normalizeAnswerText(question.answer))
      ? question.answer
      : originalChoices[originalCorrectIndex] || originalChoices[0];

    question.choices=shuffleArray(originalChoices);
    question.correct=question.choices.findIndex(choice=>normalizeAnswerText(choice)===normalizeAnswerText(correctAnswer));
    if(question.correct<0){
      question.choices.unshift(correctAnswer);
      question.correct=0;
    }
    question.answer=correctAnswer;
    return question;
  }

  function prepareLessonQuestion(question){
    return prepareChoiceQuestion(cloneQuestion(question));
  }

  function getRandomPlacementQuestions(questionBank, count=15, getColor=()=> '#00ff88'){
    const allQuestions=[];
    const levels=['A1','A2','B1','B2','C1'];
    const perLevel=Math.ceil(count/levels.length);

    levels.forEach((level)=>{
      const shuffled=shuffleArray(questionBank[level] || []);
      shuffled.slice(0,perLevel).forEach((question)=>{
        const correctAnswer=question.choices[question.correct];
        const shuffledChoices=shuffleArray([...question.choices]);
        const shuffledCorrectIndex=shuffledChoices.indexOf(correctAnswer);

        allQuestions.push({
          ...question,
          choices:shuffledChoices,
          correct:shuffledCorrectIndex,
          level,
          color:getColor(level)
        });
      });
    });

    return shuffleArray(allQuestions).slice(0,count);
  }

  const QUESTIONS_DB={
    basics:[
      {type:'choice',qtype:'🌎 Tradução',text:'Como se diz "Bom dia" em inglês?',hint:'Saudação matinal',choices:['Good morning','Good night','Good luck','Good grief'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte a frase',text:'Traduza: "Eu me chamo João"',hint:'Apresentação pessoal',words:['My','name','is','João','Your','Hello'],answer:'My name is João'},
      {type:'choice',qtype:'💬 Significado',text:'O que significa "How are you?"',hint:'Pergunta muito comum',choices:['Como vai você?','Onde você está?','O que você quer?','Quem é você?'],correct:0},
      {type:'typing',qtype:'✍️ Complete',text:'Escreva em inglês: "Obrigado"',hint:'Começa com T',answer:'thank you',acceptAll:['thank you','thanks','thankyou']},
      {type:'choice',qtype:'🌎 Tradução',text:'Como se diz "Eu moro no Brasil"?',hint:'',choices:['I live in Brazil','I love Brazil','I leave Brazil','I left Brazil'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte a frase',text:'Traduza: "Você fala português?"',hint:'',words:['Do','you','speak','Portuguese','English','Can'],answer:'Do you speak Portuguese'},
      {type:'choice',qtype:'💬 Significado',text:'O que significa "See you later"?',hint:'',choices:['Até logo!','Te vejo amanhã','Tchau para sempre','Boa sorte!'],correct:0},
      {type:'typing',qtype:'✍️ Complete',text:'Como se escreve "Água" em inglês?',hint:'5 letras',answer:'water',acceptAll:['water']},
      {type:'choice',qtype:'🌎 Tradução',text:'Como se diz "Boa noite" ao chegar?',hint:'Cumprimento noturno',choices:['Good evening','Good morning','Good luck','Goodbye'],correct:0},
      {type:'choice',qtype:'💬 Significado',text:'O que significa "Nice to meet you"?',hint:'Apresentação',choices:['Prazer em conhecer você','Boa sorte para você','Eu preciso de você','Você está atrasado'],correct:0},
      {type:'typing',qtype:'✍️ Complete',text:'Como se escreve "por favor" em inglês?',hint:'Uma palavra',answer:'please',acceptAll:['please']},
      {type:'wordorder',qtype:'🔤 Monte',text:'Traduza: "Eu gosto de música"',hint:'Use like',words:['I','like','music','love','the','song'],answer:'I like music'}
    ],
    slang:[
      {type:'choice',qtype:'😎 Gíria',text:"O que significa \"That's lit!\"?",hint:'Expressão de aprovação',choices:['Isso é incrível!','Isso é uma luz!','Isso é ruim!','Isso é cansativo!'],correct:0},
      {type:'choice',qtype:'😎 Gíria',text:'"No cap" significa...',hint:'Quando alguém diz a verdade',choices:['Sem mentira / Sério!','Sem chapéu','Não pode!','Nunca!'],correct:0},
      {type:'choice',qtype:'😎 Gíria',text:"\"You're lowkey amazing\" significa...",hint:'"Lowkey" = quietamente...',choices:['Você é secretamente incrível','Você é barulhento','Você está baixo','Não sei'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "That guy is so cool"',hint:'Esse cara é muito maneiro',words:['That','guy','is','so','cool','dude','nice'],answer:'That guy is so cool'},
      {type:'choice',qtype:'😎 Gíria',text:'"GOAT" significa...',hint:'Acrônimo famoso no esporte',choices:['Greatest Of All Time','Um bode','Grande atleta','Troféu'],correct:0},
      {type:'choice',qtype:'😎 Gíria',text:'"Vibe check" significa...',hint:'Verificar o clima de algo',choices:['Avaliar o clima/energia','Checar a música','Conferir vibração física','Testar o som'],correct:0},
      {type:'choice',qtype:'😎 Gíria',text:'"Hang out" significa...',hint:'Com amigos',choices:['Passar tempo junto','Pendurar para fora','Sair correndo','Trabalhar muito'],correct:0},
      {type:'choice',qtype:'😎 Gíria',text:'"I got you" pode significar...',hint:'Apoio ou entendimento',choices:['Pode deixar / entendi','Eu peguei você literalmente','Eu perdi você','Eu esqueci'],correct:0},
      {type:'choice',qtype:'😎 Gíria',text:'"Chill" em conversa informal significa...',hint:'Relaxar',choices:['Relaxar / tranquilo','Frio apenas','Correr','Brigar'],correct:0},
      {type:'typing',qtype:'✍️ Gíria',text:'Complete: "What\'s ___?" = E aí?',hint:'2 letras',answer:'up',acceptAll:['up']}
    ],
    travel:[
      {type:'choice',qtype:'✈️ Viagem',text:'Como perguntar onde está o banheiro?',hint:'',choices:['Where is the restroom?','Where is the restaurant?','What time is the flight?','How much is the ticket?'],correct:0},
      {type:'choice',qtype:'✈️ Viagem',text:'"Can I have the check, please?" no restaurante significa...',hint:'"Check" tem outro significado aqui',choices:['A conta, por favor','Uma comida','Uma vistoria','Um cheque'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Peça um quarto para duas pessoas',hint:'"I would like a room for two"',words:['I','would','like','a','room','for','two','three'],answer:'I would like a room for two'},
      {type:'choice',qtype:'✈️ Viagem',text:'O que é "Round trip ticket"?',hint:'',choices:['Passagem de ida e volta','Só de ida','Circular','Barata'],correct:0},
      {type:'typing',qtype:'✍️ Viagem',text:'Como se diz "aeroporto" em inglês?',hint:'7 letras',answer:'airport',acceptAll:['airport']},
      {type:'choice',qtype:'✈️ Viagem',text:'Como pedir ajuda educadamente?',hint:'Frase útil',choices:['Could you help me, please?','You help me now','Where are my bags?','I need hotel'],correct:0},
      {type:'choice',qtype:'✈️ Viagem',text:'"Boarding pass" significa...',hint:'Aeroporto',choices:['Cartão de embarque','Passaporte','Passagem de ônibus','Portão de chegada'],correct:0},
      {type:'typing',qtype:'✍️ Viagem',text:'Como se diz "bagagem" em inglês?',hint:'7 letras',answer:'luggage',acceptAll:['luggage','baggage']},
      {type:'wordorder',qtype:'🔤 Monte',text:'Pergunte: "Quanto custa?"',hint:'Preço',words:['How','much','is','it','many','cost'],answer:'How much is it'}
    ],
    daily:[
      {type:'choice',qtype:'⚡ Desafio',text:'"I\'m under the weather" significa...',hint:'Expressão idiomática',choices:['Estou me sentindo mal','Estou na chuva','Estou viajando','Estou feliz'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Diga que está com fome',hint:'"I am very hungry"',words:['I','am','very','hungry','thirsty','tired'],answer:'I am very hungry'},
      {type:'choice',qtype:'⚡ Desafio',text:'"It\'s raining cats and dogs" significa...',hint:'',choices:['Está chovendo muito forte','Chovendo animais','Granizando','Tempo estranho'],correct:0},
      {type:'typing',qtype:'✍️ Complete',text:'Trabalho remoto = "I work from ___"',hint:'4 letras',answer:'home',acceptAll:['home']},
      {type:'choice',qtype:'⚡ Desafio',text:'"Break a leg!" é usado para...',hint:'',choices:['Desejar boa sorte!','Cuidado!','Correr!','Uma ameaça'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "Have a nice day!"',hint:'Tenha um bom dia!',words:['Have','a','nice','day','good','great'],answer:'Have a nice day'},
      {type:'choice',qtype:'⚡ Desafio',text:'"I\'m running late" significa...',hint:'Rotina',choices:['Estou atrasado','Estou correndo rápido','Estou indo cedo','Estou cansado'],correct:0},
      {type:'choice',qtype:'⚡ Desafio',text:'"Make yourself at home" significa...',hint:'Recebendo alguém',choices:['Fique à vontade','Arrume sua casa','Faça sua casa','Vá para casa'],correct:0},
      {type:'typing',qtype:'✍️ Rotina',text:'Complete: "I wake ___ at 7."',hint:'Phrasal verb',answer:'up',acceptAll:['up']},
      {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "I need a break."',hint:'Preciso de uma pausa',words:['I','need','a','break','rest','take'],answer:'I need a break'}
    ],
    flashcard:[
      {type:'choice',qtype:'🃏 Flashcard',text:'AFRAID significa...',hint:'',choices:['Com medo','Confuso','Feliz','Surpreso'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'GORGEOUS significa...',hint:'',choices:['Lindo/Deslumbrante','Assustador','Confuso','Pequeno'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'OVERWHELMED significa...',hint:'',choices:['Sobrecarregado','Animado','Entediado','Relaxado'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'STUBBORN significa...',hint:'',choices:['Teimoso','Gentil','Corajoso','Estranho'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'AWKWARD significa...',hint:'',choices:['Constrangedor/Desajeitado','Animado','Elegante','Furioso'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'CRAVE significa...',hint:'',choices:['Ter desejo intenso','Ter medo','Ter pressa','Ter dinheiro'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'CONFIDENT significa...',hint:'',choices:['Confiante','Confuso','Barulhento','Cuidadoso'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'RELIABLE significa...',hint:'',choices:['Confiável','Relativo','Rápido','Recente'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'TINY significa...',hint:'',choices:['Minúsculo','Gigante','Pesado','Claro'],correct:0},
      {type:'choice',qtype:'🃏 Flashcard',text:'BRAVE significa...',hint:'',choices:['Corajoso','Bravo no sentido de irritado','Cansado','Atrasado'],correct:0}
    ],
    speed:[
      {type:'choice',qtype:'⚡ SPEED',text:'CAT = ?',hint:'',choices:['Gato','Cachorro','Pássaro','Peixe'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'HOUSE = ?',hint:'',choices:['Casa','Rua','Escola','Carro'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'HAPPY = ?',hint:'',choices:['Feliz','Triste','Bravo','Cansado'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'FRIEND = ?',hint:'',choices:['Amigo','Inimigo','Família','Vizinho'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'BOOK = ?',hint:'',choices:['Livro','Caderno','Caneta','Mesa'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'FOOD = ?',hint:'',choices:['Comida','Bebida','Roupa','Dinheiro'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'FAST = ?',hint:'',choices:['Rápido','Devagar','Forte','Fraco'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'COLD = ?',hint:'',choices:['Frio','Quente','Alto','Baixo'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'EARLY = ?',hint:'',choices:['Cedo','Tarde','Quase','Nunca'],correct:0},
      {type:'choice',qtype:'⚡ SPEED',text:'ALWAYS = ?',hint:'',choices:['Sempre','Talvez','Raramente','Ontem'],correct:0}
    ],
    boss:[
      {type:'choice',qtype:'👹 BOSS',text:'"The ball is in your court" significa...',hint:'',choices:['A decisão é sua agora','A bola está no campo','Você perdeu','Continue jogando'],correct:0},
      {type:'wordorder',qtype:'🔤 BOSS',text:"Monte: \"I couldn't agree more\"",hint:'Concordo completamente',words:["I","couldn't","agree","more","less","better"],answer:"I couldn't agree more"},
      {type:'typing',qtype:'✍️ BOSS',text:'Como se diz "À vontade" em inglês? (__ ahead)',hint:'',answer:'go ahead',acceptAll:['go ahead','go for it','feel free']},
      {type:'choice',qtype:'👹 BOSS',text:'"Bite the bullet" significa...',hint:'Expressão idiomática avançada',choices:['Aguentar firme em algo difícil','Comer uma bala','Correr rápido','Desistir de tudo'],correct:0},
      {type:'choice',qtype:'👹 BOSS',text:'Qual é o gerúndio correto de "swim"?',hint:'',choices:['swimming','swiming','swimmed','swammed'],correct:0},
      {type:'choice',qtype:'👹 BOSS',text:'"To get cold feet" significa...',hint:'Expressão idiomática',choices:['Ficar com medo de fazer algo','Sentir frio nos pés','Correr descalço','Perder tempo'],correct:0},
      {type:'choice',qtype:'👹 BOSS',text:'Qual frase está correta?',hint:'Present perfect',choices:['I have never been there','I never have be there','I never was there yet','I have never went there'],correct:0},
      {type:'typing',qtype:'✍️ BOSS',text:'Complete: "I\'m used ___ waking up early."',hint:'Preposição',answer:'to',acceptAll:['to']},
      {type:'wordorder',qtype:'🔤 BOSS',text:'Monte: "She has been working all day."',hint:'Present perfect continuous',words:['She','has','been','working','all','day','worked'],answer:'She has been working all day'}
    ],
    irregular_verbs:[
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "GO":',hint:'Verbo irregular essencial',choices:['Went','Goed','Gone','Going'],correct:0},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "SEE":',hint:'Ver',choices:['Saw','Seed','Seen','Sawed'],correct:0},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "TAKE":',hint:'Pegar/Levar',choices:['Took','Taked','Taken','Taking'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "I went to school yesterday."',hint:'Passado de GO',words:['I','went','to','school','yesterday','go','gone'],answer:'I went to school yesterday'},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "BUY":',hint:'Comprar',choices:['Bought','Buyed','Buy','Buys'],correct:0},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "THINK":',hint:'Pensar',choices:['Thought','Thinked','Thinking','Thinks'],correct:0},
      {type:'typing',qtype:'✍️ Irregulares',text:'Passado de "WRITE" (escrever):',hint:'5 letras',answer:'wrote',acceptAll:['wrote']},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "SPEAK":',hint:'Falar',choices:['Spoke','Speaked','Spoken','Speaking'],correct:0},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "DRIVE":',hint:'Dirigir',choices:['Drove','Drived','Driven','Drives'],correct:0},
      {type:'choice',qtype:'📝 Irregulares',text:'Passado de "BREAK":',hint:'Quebrar',choices:['Broke','Breaked','Broken','Breaking'],correct:0}
    ],
    phrasal_verbs:[
      {type:'choice',qtype:'🔗 Phrasal',text:'"Give up" significa:',hint:'Quando você desiste de algo',choices:['Desistir','Dar de volta','Subir','Oferecer'],correct:0},
      {type:'choice',qtype:'🔗 Phrasal',text:'"Look into" significa:',hint:'"I will look into this issue"',choices:['Investigar','Olhar dentro','Ver para baixo','Procurar'],correct:0},
      {type:'choice',qtype:'🔗 Phrasal',text:'"Run out of" significa:',hint:'"I ran out of money"',choices:['Ficar sem','Correr fora','Sair correndo','Gastar'],correct:0},
      {type:'choice',qtype:'🔗 Phrasal',text:'"Bring up" pode significar:',hint:'Levantar um assunto',choices:['Mencionar / criar filhos','Trazer para cima','Vomitar','Subir'],correct:0},
      {type:'choice',qtype:'🔗 Phrasal',text:'"Get over" significa:',hint:'"She got over the breakup"',choices:['Superar','Pular por cima','Terminar','Entender'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "I need to give up."',hint:'Preciso desistir',words:['I','need','to','give','up','out','on'],answer:'I need to give up'},
      {type:'choice',qtype:'🔗 Phrasal',text:'"Figure out" significa:',hint:'Descobrir como fazer algo',choices:['Descobrir','Calcular','Sair fora','Imaginar'],correct:0},
      {type:'choice',qtype:'🔗 Phrasal',text:'"Turn down" pode significar:',hint:'Recusar uma oferta',choices:['Recusar','Diminuir volume','Virar para baixo','Dormir'],correct:0}
    ],
    pronunciation:[
      {type:'choice',qtype:'🗣️ Pronúncia',text:'Qual pronúncia está CORRETA para "COLONEL"?',hint:'Patente militar — surpresa!',choices:['"KER-nel"','"koh-LOH-nel"','"KOH-nel"','"col-onel"'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'Qual palavra rima com "THOUGH"?',hint:'Pense no som',choices:['Go','Through','Now','Rough'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'"DESERT" (substantivo = deserto) é pronunciado:',hint:'A sílaba tônica muda no verbo!',choices:['"DEZ-ert"','"deh-ZERT"','"DEE-zert"','"duh-ZERT"'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'O "TH" em "THE" soa mais como:',hint:'Dente na língua',choices:['D com língua entre os dentes','T simples','S','Z'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'A letra silenciosa em "KNIFE" é:',hint:'Palavra que começa em K',choices:['K','N','E','F'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'"WOMEN" é pronunciado:',hint:'Plural de woman — surpreendente!',choices:['"WIM-en"','"WOH-men"','"WUH-men"','"WAH-men"'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'O "W" na palavra "ANSWER" é:',hint:'"Can I answer this?"',choices:['Silencioso','Pronunciado','Um V','Um B'],correct:0},
      {type:'choice',qtype:'🗣️ Pronúncia',text:'"DEBT" (dívida) — a letra silenciosa é:',hint:'',choices:['B','D','E','T'],correct:0}
    ],
    business:[
      {type:'choice',qtype:'💼 Negócios',text:'"To follow up" em e-mail profissional significa:',hint:'Depois de enviar o e-mail...',choices:['Fazer acompanhamento','Seguir para cima','Responder um e-mail','Deletar'],correct:0},
      {type:'choice',qtype:'💼 Negócios',text:'"Let\'s circle back on this" significa:',hint:'Frase comum em reuniões',choices:['Voltemos a este assunto depois','Vamos girar em círculos','Desistamos disto','Concordemos'],correct:0},
      {type:'choice',qtype:'💼 Negócios',text:'"ASAP" significa:',hint:'Muito urgente!',choices:['As Soon As Possible','Always Send All Papers','A Simple Action Plan','After Signing A Protocol'],correct:0},
      {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "Please find attached the report."',hint:'E-mail formal clássico',words:['Please','find','attached','the','report','sent','document'],answer:'Please find attached the report'},
      {type:'choice',qtype:'💼 Negócios',text:'"To touch base" significa:',hint:'Expressão de networking',choices:['Fazer contato brevemente','Tocar na base','Assinar contrato','Reunir a equipe'],correct:0},
      {type:'choice',qtype:'💼 Negócios',text:'"Bottom line" em contexto de negócios significa:',hint:'"The bottom line is..."',choices:['O ponto principal / lucro líquido','A linha de baixo','A conclusão óbvia','O documento final'],correct:0},
      {type:'typing',qtype:'✍️ Negócios',text:'Como se diz "reunião" em inglês?',hint:'7 letras',answer:'meeting',acceptAll:['meeting']},
      {type:'choice',qtype:'💼 Negócios',text:'"To be on the same page" significa:',hint:'Expressão de alinhamento',choices:['Estar alinhados / concordar','Ler o mesmo livro','Estar na mesma reunião','Ter o mesmo objetivo'],correct:0}
    ],
    karaoke:[
      {
        type:'karaoke',qtype:'🎤 Karaokê',text:'Blinding Lights',hint:'The Weeknd - Hit 2020',answer:'Blinding Lights',ytId:'4NRXx6U8ABQ',
        lyrics:[{time:0,text:"I we've been"},{time:3,text:'I call it'},{time:6,text:'Blinding'},{time:9,text:'Lights'},{time:12,text:'Up above'},{time:15,text:"You're"},{time:18,text:'Gone'},{time:21,text:'Been searching'},{time:24,text:'For a cure'}]
      },
      {
        type:'karaoke',qtype:'🎤 Karaokê',text:'Shape of You',hint:'Ed Sheeran - Acústico',answer:'Shape of You',ytId:'JGwWNGJdvx8',
        lyrics:[{time:0,text:'The club'},{time:3,text:"Isn't the"},{time:6,text:'Best place'},{time:9,text:'To find a'},{time:12,text:'Short'},{time:15,text:'Love'},{time:18,text:"So let's"},{time:21,text:'Go'},{time:24,text:'To somewhere'},{time:27,text:'We can'},{time:30,text:'Talk'}]
      },
      {
        type:'karaoke',qtype:'🎤 Karaokê',text:'Stay',hint:'The Kid LAROI & Justin Bieber',answer:'Stay',ytId:'kTJczUoc6-U',
        lyrics:[{time:0,text:'I do'},{time:3,text:'I do'},{time:6,text:'That I'},{time:9,text:'Stay'},{time:12,text:'A little'},{time:15,text:'Longer'},{time:18,text:'Here'},{time:21,text:'I'},{time:24,text:'I'},{time:27,text:'I'},{time:30,text:'Stay'}]
      }
    ],
    crossword:[
      {
        type:'crossword',qtype:'🧩 Cruzadas',text:'Complete as palavras',hint:'Use as dicas',
        grid:['HELLO','WORLD','APPLE','GRAPE','MUSIC','RADIO'],
        clues:[
          {word:'HELLO',clue:'Greeting (5 letters)',answer:'HELLO'},
          {word:'WORLD',clue:'Planet Earth (5 letters)',answer:'WORLD'},
          {word:'APPLE',clue:'Red fruit (5 letters)',answer:'APPLE'},
          {word:'GRAPE',clue:'Wine fruit (5 letters)',answer:'GRAPE'},
          {word:'MUSIC',clue:'Sound art (5 letters)',answer:'MUSIC'},
          {word:'RADIO',clue:'Broadcast device (5 letters)',answer:'RADIO'}
        ]
      }
    ],
    shadowing:[
      {type:'shadowing',qtype:'🎯 Shadowing',text:'Listen and repeat the phrase',hint:'Press 🔊 to hear, then 🎤 to record',answer:'How are you doing today?',expected:'how are you doing today'},
      {type:'shadowing',qtype:'🎯 Shadowing',text:'Listen and repeat',hint:'Listen carefully to pronunciation',answer:'I would like a cup of coffee',expected:'i would like a cup of coffee'},
      {type:'shadowing',qtype:'🎯 Shadowing',text:'Listen and repeat',hint:'Focus on the rhythm',answer:'Nice to meet you',expected:'nice to meet you'},
      {type:'shadowing',qtype:'🎯 Shadowing',text:'Listen and repeat',hint:'Try to match the speed',answer:'What time is the meeting?',expected:'what time is the meeting'}
    ],
    fillblank:[
      {type:'fillblank',qtype:'🎵 Ditado',text:'Complete the lyric',hint:'Type the missing word',answer:'Hello from the other side',blank:'the other side',choices:['the other side','my mind','all night','to say goodbye']},
      {type:'fillblank',qtype:'🎵 Ditado',text:'Complete the lyric',hint:'Fill in the blank',answer:'Is this the real life',blank:'the real life',choices:['the real life','is this','somewhere','fantasy']},
      {type:'fillblank',qtype:'🎵 Ditado',text:'Complete the lyric',hint:'Listen and type',answer:'We are the champions',blank:'the champions',choices:['the champions','we are','my friends','of the world']},
      {type:'fillblank',qtype:'🎵 Ditado',text:'Complete the lyric',hint:'Fill the gap',answer:'Baby shark doo doo',blank:'doo doo',choices:['doo doo','doo','dadada','tatata']}
    ]
  };

  function createController(options={}){
    const $=options.$ || ((id)=>document.getElementById(id));
    const $$=options.$$ || ((selector)=>Array.from(document.querySelectorAll(selector)));
    const createEl=options.createEl || ((tag,cls,text='')=>{
      const el=document.createElement(tag);
      if(cls) el.className=cls;
      el.textContent=text;
      return el;
    });
    const setVisible=options.setVisible || ((id,visible)=>{
      const el=typeof id==='string' ? $(id) : id;
      if(el) el.style.display=visible ? '' : 'none';
    });
    const setWidth=options.setWidth || ((id,width)=>{
      const el=$(id);
      if(el) el.style.width=width;
    });
    const state=options.state || {};
    const levels=options.levels || [];
    const youtubeEmbedBase=options.youtubeEmbedBase || 'https://www.youtube-nocookie.com/embed';
    const normalizeSongText=options.normalizeSongText || normalizeAnswerText;
    const noop=()=>{};
    const showScreen=options.showScreen || noop;
    const showToast=options.showToast || noop;
    const floatXP=options.floatXP || noop;
    const speakText=options.speakText || noop;
    const startSpeechRec=options.startSpeechRec || noop;
    const updateUI=options.updateUI || noop;
    const saveState=options.saveState || noop;
    const notifyLessonCompleted=options.notifyLessonCompleted || noop;
    const launchConfetti=options.launchConfetti || noop;
    const showXpPopup=options.showXpPopup || noop;
    const switchTab=options.switchTab || noop;
    const switchMusicTab=options.switchMusicTab || noop;

    let currentLesson=[];
    let currentQ=0;
    let lessonCorrect=0;
    let lessonLivesLeft=3;
    let selectedChoice=-1;
    let wordOrderAnswer=[];
    let currentLessonType='basics';
    let lessonStartTime=0;
    let isAnswered=false;

    function setText(id,text){
      const el=$(id);
      if(el) el.textContent=text ?? '';
    }

    function renderKaraokeList(){
      const container=$('karaoke-list');
      if(!container) return;

      const karaokeSongs=QUESTIONS_DB.karaoke || [];
      container.innerHTML='';

      if(karaokeSongs.length===0){
        container.innerHTML='<div class="empty-state"><div class="empty-state-icon">🎤</div><div class="empty-state-title">Sem músicas de karaokê</div><div class="empty-state-copy">Em breve!</div></div>';
        return;
      }

      karaokeSongs.forEach((song,index)=>{
        const card=document.createElement('div');
        card.className='sugg-card karaoke-card';
        card.style.cssText='cursor:pointer;';
        const thumb=createEl('div','sugg-thumb','🎤');
        thumb.style.cssText='background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-size:1.5rem;';
        const meta=createEl('div','sugg-meta','');
        meta.append(
          createEl('div','sugg-title',song.text || song.answer || 'Karaokê '+(index+1)),
          createEl('div','sugg-artist',song.hint || '')
        );
        card.append(thumb,meta,createEl('span','sugg-arrow','▶'));
        card.onclick=()=>startKaraokeFromList(song);
        container.appendChild(card);
      });
    }

    function getVerifiedKaraokeQuestion(song,key=''){
      const karaokeSongs=QUESTIONS_DB.karaoke || [];
      const normalizedKey=String(key || '').trim();
      const normalizedTitle=normalizeSongText(song?.title || '');
      const normalizedArtist=normalizeSongText(song?.artist || '');

      return karaokeSongs.find(item=>{
        const itemTitle=normalizeSongText(item.text || item.answer || '');
        const itemHint=normalizeSongText(item.hint || '');
        return (
          (song?.ytId && item.ytId===song.ytId) ||
          (normalizedTitle && itemTitle===normalizedTitle) ||
          (normalizedTitle && normalizedArtist && itemTitle===normalizedTitle && itemHint.includes(normalizedArtist)) ||
          (normalizedKey && normalizeSongText(normalizedKey)===itemTitle)
        );
      }) || null;
    }

    function startKaraokeFromList(karaokeSong){
      setVisible('music-search-panel', false);
      setVisible('music-favs-panel', false);
      setVisible('music-player', false);
      setVisible('choicesArea', true);

      currentLessonType='karaoke';
      currentLesson=[prepareLessonQuestion(karaokeSong)];
      currentQ=0;
      lessonCorrect=0;
      lessonLivesLeft=3;
      lessonStartTime=Date.now();
      isAnswered=false;

      showScreen('lesson');
      renderQuestion();
      updateLessonLives();
    }

    function startLesson(type){
      currentLessonType=type;
      const pool=QUESTIONS_DB[type] || QUESTIONS_DB.basics;
      currentLesson=shuffleArray(pool.map(prepareLessonQuestion)).slice(0,Math.min(pool.length,6));
      currentQ=0;
      lessonCorrect=0;
      lessonLivesLeft=3;
      lessonStartTime=Date.now();
      isAnswered=false;
      showScreen('lesson');
      renderQuestion();
      updateLessonLives();
    }

    function resetQuestionUi(q){
      isAnswered=false;
      setWidth('lessonBar', currentLesson.length ? (currentQ/currentLesson.length)*100+'%' : '0%');
      setText('qType', q.qtype);
      setText('qText', q.text);
      setText('qHint', q.hint || '');

      let speakBtn=document.getElementById('speakQBtn');
      const qText=$('qText');
      if(qText && !speakBtn){
        speakBtn=document.createElement('button');
        speakBtn.id='speakQBtn';
        speakBtn.className='speak-btn';
        speakBtn.title='Ouvir pronúncia';
        qText.parentNode.insertBefore(speakBtn, $('qHint')?.nextSibling || qText.nextSibling);
      }

      if(speakBtn){
        const qWords=q.answer || (q.choices && q.choices[q.correct]) || '';
        const speakTarget=typeof qWords==='string' ? qWords : q.text;
        speakBtn.innerHTML='🔊 Ouvir';
        speakBtn.onclick=()=>speakText(speakTarget);
      }

      setVisible('choicesArea', false);
      setVisible('wordOrderArea', false);
      setVisible('typingArea', false);

      const feedback=$('feedbackOverlay');
      if(feedback){
        feedback.className='feedback-overlay';
        feedback.classList.remove('show');
      }

      const submitBtn=$('submitBtn');
      if(submitBtn){
        submitBtn.disabled=true;
        submitBtn.textContent='Verificar ✓';
      }

      selectedChoice=-1;
      wordOrderAnswer=[];
    }

    function renderQuestion(){
      const q=currentLesson[currentQ];
      if(!q){
        showToast('Nenhuma pergunta disponível para esta lição.','error');
        showScreen('app');
        return;
      }

      resetQuestionUi(q);

      if(q.type==='choice') return renderChoiceQuestion(q);
      if(q.type==='wordorder') return renderWordOrderQuestion(q);
      if(q.type==='typing') return renderTypingQuestion(q);
      if(q.type==='karaoke') return renderKaraokeQuestion(q);
      if(q.type==='crossword') return renderCrosswordQuestion(q);
      if(q.type==='shadowing') return renderShadowingQuestion(q);
      if(q.type==='fillblank') return renderFillblankQuestion(q);
    }

    function renderChoiceQuestion(q){
      const area=$('choicesArea');
      if(!area) return;
      setVisible('choicesArea', true);
      area.innerHTML='';
      const letters=['A','B','C','D'];
      q.choices.forEach((choice,index)=>{
        const btn=document.createElement('button');
        btn.className='choice-btn';
        btn.append(createEl('span','choice-letter',letters[index] || String(index+1)),document.createTextNode(String(choice)));
        btn.onclick=()=>selectChoice(index,btn);
        area.appendChild(btn);
      });
    }

    function renderWordOrderQuestion(q){
      setVisible('wordOrderArea', true);
      const ansArea=$('answerArea');
      const bank=$('wordBank');
      if(!ansArea || !bank) return;
      ansArea.innerHTML='<span class="answer-placeholder" id="answerPlaceholder">Toque nas palavras para montar a frase</span>';
      ansArea.classList.remove('has-words');
      bank.innerHTML='';
      shuffleArray(q.words || []).forEach(word=>{
        const chip=document.createElement('div');
        chip.className='word-chip';
        chip.textContent=word;
        chip.onclick=()=>addWordToAnswer(word,chip);
        bank.appendChild(chip);
      });
    }

    function renderTypingQuestion(q){
      setVisible('typingArea', true);
      const inp=$('typeInput');
      const submitBtn=$('submitBtn');
      if(!inp || !submitBtn) return;
      inp.value='';
      inp.focus();
      inp.oninput=()=>{ submitBtn.disabled=inp.value.trim().length===0; };
      inp.onkeydown=(event)=>{ if(event.key==='Enter' && !submitBtn.disabled && !isAnswered) submitAnswer(); };

      let micBtn=document.getElementById('micRecBtn');
      if(!micBtn){
        micBtn=document.createElement('button');
        micBtn.id='micRecBtn';
        micBtn.className='mic-btn';
        micBtn.title='Falar a resposta';
        $('typingArea')?.appendChild(micBtn);
      }

      micBtn.innerHTML='🎤';
      micBtn.disabled=false;
      micBtn.onclick=()=>{
        micBtn.innerHTML='🔴';
        micBtn.disabled=true;
        startSpeechRec((transcript)=>{
          inp.value=transcript;
          submitBtn.disabled=false;
          micBtn.innerHTML='🎤';
          micBtn.disabled=false;
        },()=>{
          micBtn.innerHTML='🎤';
          micBtn.disabled=false;
        });
      };
    }

    function renderKaraokeQuestion(q){
      setVisible('choicesArea', true);
      const area=$('choicesArea');
      if(!area) return;
      const karaokeEmbedUrl=`${youtubeEmbedBase}/${q.ytId}?rel=0&modestbranding=1&playsinline=1`;
      const lyrics=q.lyrics || [];

      area.innerHTML=`
        <div class="karaoke-full" id="karaokeFull">
          <div class="karaoke-header">
            <div class="karaoke-title">${q.text || 'Karaokê'}</div>
            <div class="karaoke-artist">${q.hint || ''}</div>
          </div>
          <div class="karaoke-youtube" id="karaokeYoutube">
            <iframe id="karaokeFallbackFrame" src="${karaokeEmbedUrl}" title="Karaokê YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>
            <div id="youtube-player-karaoke"></div>
          </div>
          <div class="karaoke-lyrics-scroll" id="karaokeLyricsScroll">
            <div class="karaoke-lyrics-list" id="karaokeLyricsList"></div>
          </div>
          <div class="karaoke-display" id="karaokeDisplay">
            <div class="karaoke-current-line" id="karaokeCurrentLine">🎤 Aguarde o vídeo carregar...</div>
          </div>
          <div class="karaoke-timer-bar"><div class="karaoke-timer-progress" id="karaokeTimerBar"></div></div>
          <div class="karaoke-actions"><button class="karaoke-sing-btn" id="karaokeSingBtn" disabled>🎤 AGUARDE...</button></div>
          <div class="karaoke-score" id="karaokeScore">
            <span class="score-perfect">PERFECT: <b id="perfectCount">0</b></span>
            <span class="score-good">GOOD: <b id="goodCount">0</b></span>
            <span class="score-miss">MISS: <b id="missCount">0</b></span>
          </div>
        </div>
      `;

      const lyricsList=$('karaokeLyricsList');
      if(lyricsList){
        lyricsList.innerHTML='';
        lyrics.forEach((line,index)=>{
          const div=document.createElement('div');
          div.className='karaoke-lyric-line';
          div.id='karaoke-line-'+index;
          div.textContent=line.text;
          lyricsList.appendChild(div);
        });
      }

      let currentLineIndex=0;
      let isPlaying=false;
      let perfectCount=0;
      let goodCount=0;
      let missCount=0;
      let player=null;
      let lyricsInterval=null;
      let ytReady=false;
      let isListening=false;

      function enableFallbackPlayer(){
        if(ytReady) return;
        ytReady=true;
        const singBtn=$('karaokeSingBtn');
        if(singBtn){
          singBtn.disabled=false;
          singBtn.textContent='🎤 SING!';
        }
        setText('karaokeCurrentLine','🎤 Pressione SING! Cante acompanhando o vídeo e a letra.');
      }

      function createYoutubePlayer(){
        if(!window.YT || !window.YT.Player || player) return;
        const fallbackFrame=$('karaokeFallbackFrame');
        if(fallbackFrame) fallbackFrame.style.display='none';

        player=new window.YT.Player('youtube-player-karaoke',{
          height:'100%',
          width:'100%',
          videoId:q.ytId,
          playerVars:{autoplay:0,rel:0,modestbranding:1,controls:1,showinfo:0,playsinline:1},
          events:{
            onReady(){
              ytReady=true;
              const singBtn=$('karaokeSingBtn');
              if(singBtn){
                singBtn.disabled=false;
                singBtn.textContent='🎤 SING!';
              }
              setText('karaokeCurrentLine','🎤 Pressione SING! Use o vídeo para ouvir e cante quando a linha brilhar!');
            },
            onStateChange(event){
              if(event.data===window.YT.PlayerState.PLAYING && isPlaying) startLyricsSync();
              else if(event.data!==window.YT.PlayerState.PLAYING) stopLyricsSync();
            }
          }
        });
      }

      if(window.YT?.Player){
        createYoutubePlayer();
      }else{
        const previousCallback=window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady=()=>{
          if(typeof previousCallback==='function') previousCallback();
          createYoutubePlayer();
        };
        if(!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')){
          const tag=document.createElement('script');
          tag.src='https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
      }

      setTimeout(enableFallbackPlayer,5000);

      function startLyricsSync(){
        if(lyricsInterval) clearInterval(lyricsInterval);
        lyricsInterval=setInterval(()=>{
          if(!player || !player.getCurrentTime || !isPlaying) return;
          updateKaraokeLineTime(player.getCurrentTime());
        },100);
      }

      function stopLyricsSync(){
        if(lyricsInterval){
          clearInterval(lyricsInterval);
          lyricsInterval=null;
        }
      }

      function updateKaraokeLineTime(currentTime){
        let activeIndex=0;
        for(let index=0;index<lyrics.length;index+=1){
          if(lyrics[index].time<=currentTime) activeIndex=index;
          else break;
        }

        currentLineIndex=activeIndex;
        lyrics.forEach((_,index)=>{
          const lineEl=$('karaoke-line-'+index);
          if(!lineEl) return;
          lineEl.classList.remove('active','passed');
          if(index<activeIndex) lineEl.classList.add('passed');
          if(index===activeIndex) lineEl.classList.add('active');
        });

        const activeLineEl=$('karaoke-line-'+activeIndex);
        if(activeLineEl){
          activeLineEl.scrollIntoView({behavior:'smooth',block:'center'});
          setText('karaokeCurrentLine',lyrics[activeIndex].text);
        }

        const timerBar=$('karaokeTimerBar');
        if(timerBar && lyrics[activeIndex]){
          const lineStart=lyrics[activeIndex].time;
          const lineEnd=lyrics[activeIndex+1] ? lyrics[activeIndex+1].time : lineStart+4;
          const progress=((currentTime-lineStart)/(lineEnd-lineStart))*100;
          timerBar.style.width=Math.min(100,Math.max(0,progress))+'%';
        }
      }

      function startKaraokeListen(){
        if(!ytReady || currentLineIndex>=lyrics.length) return;
        const line=lyrics[currentLineIndex];
        if(!line) return;
        const singBtn=$('karaokeSingBtn');
        if(singBtn){
          singBtn.textContent='🔴 OUÇA SUA VOZ...';
          singBtn.classList.add('listening');
        }
        isListening=true;
        startSpeechRec((transcript)=>{
          isListening=false;
          evaluateKaraokeSing(transcript,line.text);
        },()=>{
          isListening=false;
          if(singBtn){
            singBtn.textContent='🎤 SING!';
            singBtn.classList.remove('listening');
          }
        });
      }

      function evaluateKaraokeSing(transcript,expected){
        if(!transcript || !expected) return;
        const singBtn=$('karaokeSingBtn');
        const currentLine=$('karaokeCurrentLine');
        const normTranscript=transcript.toLowerCase().replace(/[^a-z\s]/g,'').trim();
        const normExpected=expected.toLowerCase().replace(/[^a-z\s]/g,'').trim();
        const similarity=calculateSimilarity(normTranscript,normExpected);
        let result='';

        if(similarity>=0.6){
          result='🎤 PERFECT! 🎤';
          perfectCount+=1;
          floatXP('+20 XP');
        }else if(similarity>=0.3){
          result='👍 GOOD! 👍';
          goodCount+=1;
          floatXP('+10 XP');
        }else{
          result='😅 MISS 😅';
          missCount+=1;
        }

        if(currentLine){
          currentLine.classList.remove('singing');
          currentLine.classList.add(similarity>=0.6 ? 'perfect' : similarity>=0.3 ? 'good' : 'miss');
          currentLine.textContent=result+' - Você: "'+transcript+'"';
        }

        setText('perfectCount',perfectCount);
        setText('goodCount',goodCount);
        setText('missCount',missCount);

        setTimeout(()=>{
          currentLine?.classList.remove('perfect','good','miss');
          if(singBtn){
            singBtn.textContent='🎤 SING!';
            singBtn.classList.remove('listening');
          }
        },1500);
      }

      function calculateSimilarity(str1,str2){
        if(!str1 || !str2) return 0;
        const words1=str1.split(/\s+/);
        const words2=str2.split(/\s+/);
        let matchCount=0;
        words1.forEach(wordA=>{
          if(words2.some(wordB=>wordA===wordB || wordA.includes(wordB) || wordB.includes(wordA))) matchCount+=1;
        });
        return matchCount/Math.max(words1.length,words2.length);
      }

      const singBtn=$('karaokeSingBtn');
      if(singBtn){
        singBtn.onclick=()=>{
          if(!ytReady) return;
          if(!isPlaying){
            isPlaying=true;
            singBtn.textContent='🎤 CANTANDO...';
            singBtn.classList.add('active');
            if(player?.playVideo) player.playVideo();
            else startLyricsSync();
          }else if(!isListening){
            startKaraokeListen();
          }
        };
      }

      if(lyrics.length>0){
        $('karaoke-line-0')?.classList.add('active');
        setText('karaokeCurrentLine',lyrics[0].text);
        setTimeout(()=>speakText(lyrics[0].text),1000);
      }
    }

    function renderCrosswordQuestion(q){
      setVisible('choicesArea', true);
      const area=$('choicesArea');
      if(!area) return;
      area.innerHTML='<div class="crossword-container" id="crosswordContainer"><div class="crossword-clues" id="crosswordClues"></div></div>';
      const cluesArea=$('crosswordClues');
      if(!cluesArea) return;
      cluesArea.innerHTML='<h3>'+(q.text || 'Crossword')+'</h3>';
      q.clues.forEach((clue,index)=>{
        const div=document.createElement('div');
        div.className='crossword-clue';
        div.innerHTML='<strong>'+(index+1)+'.</strong> '+clue.clue;
        div.onclick=()=>promptCrosswordAnswer(clue);
        cluesArea.appendChild(div);
      });
    }

    function renderShadowingQuestion(q){
      setVisible('choicesArea', true);
      const area=$('choicesArea');
      if(!area) return;
      area.innerHTML='<div class="shadowing-container" id="shadowContainer"><div class="shadowing-phrase">'+(q.answer || '')+'</div><div class="shadowing-hint">'+(q.hint || '')+'</div><button class="shadowing-speak-btn" id="shadowSpeakBtn">🔊 Ouvir</button><button class="shadowing-record-btn" id="shadowRecordBtn">🎤 Gravar</button></div>';
      $('shadowSpeakBtn').onclick=()=>speakText(q.answer);
      $('shadowRecordBtn').onclick=()=>startShadowingRecording(q.answer,q.expected);
    }

    function renderFillblankQuestion(q){
      setVisible('choicesArea', true);
      const area=$('choicesArea');
      if(!area) return;
      area.innerHTML='<div class="fillblank-container" id="fillblankContainer"><div class="fillblank-text">'+(q.text || '')+'</div><div class="fillblank-input-row"><input class="type-input" id="fillblankInput" placeholder="Digite a palavra faltante..." /><button class="btn-fire" id="fillblankSubmitBtn">Verificar</button></div></div>';
      $('fillblankSubmitBtn').onclick=()=>submitFillblankAnswer(q.blank);
      $('fillblankInput').focus();
    }

    function startShadowingRecording(phrase,expected){
      if(isAnswered) return;
      const btn=$('shadowRecordBtn');
      if(btn) btn.textContent='🔴 Gravando...';
      startSpeechRec((transcript)=>{
        if(btn) btn.textContent='🎤 Gravar';
        isAnswered=true;
        const normalized=transcript.toLowerCase().replace(/[^a-z\s]/g,'');
        const target=expected.toLowerCase();
        const similarity=normalized.includes(target) || target.includes((normalized.split(' ')[0] || ''));
        if(similarity && normalized.length>target.length*0.5){
          lessonCorrect+=1;
          floatXP('+15 XP');
          showToast('🎉 Excelente pronúncia!','success');
        }else{
          lessonLivesLeft=Math.max(0,lessonLivesLeft-1);
          showToast('Ouviu-se: "'+transcript+'" - Tente novamente!','error');
        }
        updateLessonLives();
      },()=>{
        if(btn) btn.textContent='🎤 Gravar';
      });
    }

    function submitFillblankAnswer(correctAnswer){
      if(isAnswered) return;
      const input=$('fillblankInput');
      const userAnswer=(input?.value || '').trim().toLowerCase();
      if(!userAnswer) return;
      isAnswered=true;
      const isCorrect=userAnswer===String(correctAnswer).toLowerCase();
      if(isCorrect){
        lessonCorrect+=1;
        floatXP('+10 XP');
        showToast('✅ Correto!','success');
      }else{
        lessonLivesLeft=Math.max(0,lessonLivesLeft-1);
        showToast('❌ Era: '+correctAnswer,'error');
      }
      updateLessonLives();
    }

    function promptCrosswordAnswer(clue){
      if(isAnswered) return;
      const userAnswer=window.prompt(clue.clue+'\nSua resposta:');
      if(!userAnswer) return;
      isAnswered=true;
      const isCorrect=userAnswer.toUpperCase().trim()===clue.answer.toUpperCase();
      if(isCorrect){
        lessonCorrect+=1;
        floatXP('+10 XP');
        showToast('✅ Correto!','success');
      }else{
        lessonLivesLeft=Math.max(0,lessonLivesLeft-1);
        showToast('❌ Era: '+clue.answer,'error');
      }
      updateLessonLives();
    }

    function selectChoice(index,btn){
      if(isAnswered) return;
      selectedChoice=index;
      $$('.choice-btn').forEach(button=>button.classList.remove('selected'));
      btn.classList.add('selected');
      const submitBtn=$('submitBtn');
      if(submitBtn) submitBtn.disabled=false;
    }

    function addWordToAnswer(word,chip){
      if(isAnswered || chip.classList.contains('used')) return;
      chip.classList.add('used');
      wordOrderAnswer.push({word,chip});
      const ansArea=$('answerArea');
      const placeholder=$('answerPlaceholder');
      placeholder?.remove();
      ansArea?.classList.add('has-words');
      const wordEl=document.createElement('div');
      wordEl.className='answer-word';
      wordEl.textContent=word;
      wordEl.addEventListener('click',()=>removeWordFromAnswer(wordEl,chip));
      ansArea?.appendChild(wordEl);
      const submitBtn=$('submitBtn');
      if(submitBtn) submitBtn.disabled=wordOrderAnswer.length===0;
    }

    function removeWordFromAnswer(wordEl,chip){
      if(isAnswered) return;
      wordEl.remove();
      chip.classList.remove('used');
      wordOrderAnswer=wordOrderAnswer.filter(item=>item.chip!==chip);
      const ansArea=$('answerArea');
      if(ansArea && wordOrderAnswer.length===0){
        ansArea.innerHTML='<span class="answer-placeholder" id="answerPlaceholder">Toque nas palavras para montar a frase</span>';
        ansArea.classList.remove('has-words');
        const submitBtn=$('submitBtn');
        if(submitBtn) submitBtn.disabled=true;
      }
    }

    function submitAnswer(){
      if(isAnswered) return;
      isAnswered=true;
      const q=currentLesson[currentQ];
      let isCorrect=false;
      const submitBtn=$('submitBtn');
      if(submitBtn) submitBtn.disabled=true;

      if(q.type==='choice'){
        isCorrect=selectedChoice===q.correct;
        $$('.choice-btn').forEach((btn,index)=>{
          btn.style.pointerEvents='none';
          if(index===q.correct) btn.classList.add('correct');
          else if(index===selectedChoice && !isCorrect) btn.classList.add('wrong');
        });
      }else if(q.type==='wordorder'){
        const userAnswer=wordOrderAnswer.map(item=>item.word).join(' ');
        isCorrect=normalizeAnswerText(userAnswer)===normalizeAnswerText(q.answer);
        $$('.answer-word').forEach(word=>{ word.style.borderColor=isCorrect ? 'var(--green)' : 'var(--pink)'; });
        if(!isCorrect){
          const ansArea=$('answerArea');
          const hint=document.createElement('div');
          hint.className='answer-hint';
          hint.textContent='✓ '+q.answer;
          ansArea?.appendChild(hint);
        }
      }else if(q.type==='typing'){
        const input=$('typeInput');
        const userValue=(input?.value || '').trim().toLowerCase();
        isCorrect=(q.acceptAll || [q.answer]).some(answer=>userValue===String(answer).toLowerCase());
        if(input){
          input.style.borderColor=isCorrect ? 'var(--green)' : 'var(--pink)';
          if(!isCorrect){
            input.value=q.answer;
            input.style.color='var(--muted)';
          }
        }
      }

      if(isCorrect){
        lessonCorrect+=1;
        floatXP('+10 XP');
      }else{
        lessonLivesLeft=Math.max(0,lessonLivesLeft-1);
        state.lives=Math.max(0,Number(state.lives || 0)-1);
        state.livesLastRegen=state.livesLastRegen || Date.now();
        updateUI();
        updateLessonLives();
        if(lessonLivesLeft===0) setTimeout(()=>showFeedback(false,q,true),800);
      }
      showFeedback(isCorrect,q,false);
    }

    function showFeedback(correct,q,gameOver){
      const feedback=$('feedbackOverlay');
      if(!feedback) return;
      feedback.className='feedback-overlay '+(correct ? 'correct-fb' : 'wrong-fb');
      setText('fbIcon',correct ? ['🎉','⭐','🔥','✨'][Math.floor(Math.random()*4)] : '💔');
      const title=$('fbTitle');
      if(title){
        title.className='fb-title '+(correct ? 'c' : 'w');
        title.textContent=correct ? ['Incrível!','Mandou bem!','Correto!','Perfeito!'][Math.floor(Math.random()*4)] : (gameOver ? 'Sem vidas!' : 'Errou!');
      }

      const msg=$('fbMsg');
      if(msg){
        if(correct) msg.textContent=['Continue assim!','Você está indo muito bem!','Bora para a próxima!','Excelente resposta!'][Math.floor(Math.random()*4)];
        else if(gameOver) msg.textContent='Você ficou sem vidas. Vamos ver seu resultado!';
        else if(q.type==='choice') msg.textContent='A resposta correta era: '+q.choices[q.correct];
        else if(q.type==='wordorder') msg.textContent='Ordem correta: '+q.answer;
        else msg.textContent='Resposta correta: '+q.answer;
      }

      const contBtn=$('continueBtn');
      if(contBtn){
        contBtn.className='btn-continue '+(correct ? 'c' : 'w');
        contBtn.textContent=gameOver ? 'Ver resultado →' : 'Continuar →';
      }
      setTimeout(()=>feedback.classList.add('show'),50);
    }

    function nextQuestion(){
      const feedback=$('feedbackOverlay');
      feedback?.classList.remove('show');
      if(lessonLivesLeft===0){
        setTimeout(finishLesson,400);
        return;
      }
      currentQ+=1;
      if(currentQ>=currentLesson.length) setTimeout(finishLesson,400);
      else setTimeout(renderQuestion,400);
    }

    function updateLessonLives(){
      setText('lessonLives','❤️'.repeat(lessonLivesLeft)+'🖤'.repeat(Math.max(0,3-lessonLivesLeft)));
    }

    function checkLevelUp(){
      const levelData=levels[state.level-1];
      if(levelData && state.xp>=levelData.xpNeeded && state.level<levels.length){
        state.level+=1;
        showToast('🎉 Subiu para nível '+state.level+'!','success');
      }
    }

    function finishLesson(){
      const elapsed=Math.round((Date.now()-lessonStartTime)/1000);
      const total=currentLesson.length || 1;
      const acc=Math.round((lessonCorrect/total)*100);
      const xpGained=lessonCorrect*10+(acc===100 ? 25 : 0)+(lessonLivesLeft===3 ? 15 : 0);

      state.xp=Number(state.xp || 0)+xpGained;
      state.totalCorrect=Number(state.totalCorrect || 0)+lessonCorrect;
      state.totalLessons=Number(state.totalLessons || 0)+1;
      state.achievements=Array.isArray(state.achievements) ? state.achievements : [];

      const today=new Date().toDateString();
      if(state.lastPlayed!==today){
        const yesterday=new Date(Date.now()-86400000).toDateString();
        state.streak=state.lastPlayed===yesterday ? Number(state.streak || 0)+1 : 1;
        state.lastPlayed=today;
      }

      if(!state.achievements.includes('first')) state.achievements.push('first');
      if(state.streak>=3 && !state.achievements.includes('streak3')) state.achievements.push('streak3');
      if(state.xp>=100 && !state.achievements.includes('xp100')) state.achievements.push('xp100');
      if(state.xp>=500 && !state.achievements.includes('xp500')) state.achievements.push('xp500');
      if(acc===100 && !state.achievements.includes('perfect')) state.achievements.push('perfect');
      if(state.totalLessons>=5 && !state.achievements.includes('lessons5')) state.achievements.push('lessons5');

      checkLevelUp();
      updateUI();
      saveState();
      notifyLessonCompleted();

      const emojis=acc===100 ? ['🏆','🌟','💎'] : acc>=70 ? ['🔥','⭐','😎'] : ['💪','🌱','😅'];
      setText('resultEmoji',emojis[Math.floor(Math.random()*3)]);
      setText('resultTitle',acc===100 ? 'Perfeito!' : acc>=70 ? 'Muito bom!' : 'Continue praticando!');
      setText('resultSub',`${lessonCorrect}/${total} corretas`);
      setText('resXp','+'+xpGained);
      setText('resAcc',acc+'%');
      setText('resTime',elapsed+'s');
      showScreen('result');
      if(acc===100) launchConfetti();
      showXpPopup('+'+xpGained+' XP');
    }

    function exitLesson(){
      if(currentLessonType==='karaoke'){
        switchTab('music');
        switchMusicTab('search');
      }else{
        showScreen('app');
      }
      updateUI();
    }

    function returnHome(){
      showScreen('app');
      updateUI();
    }

    function playAgain(){
      startLesson(currentLessonType);
    }

    return {
      questionsDb:QUESTIONS_DB,
      renderKaraokeList,
      getVerifiedKaraokeQuestion,
      startKaraokeFromList,
      startLesson,
      renderQuestion,
      startShadowingRecording,
      submitFillblankAnswer,
      promptCrosswordAnswer,
      selectChoice,
      addWordToAnswer,
      removeWordFromAnswer,
      submitAnswer,
      nextQuestion,
      updateLessonLives,
      finishLesson,
      exitLesson,
      returnHome,
      playAgain
    };
  }

  window.LinguaFireLessons={
    QUESTIONS_DB,
    cloneQuestion,
    createController,
    getRandomPlacementQuestions,
    normalizeAnswerText,
    prepareChoiceQuestion,
    prepareLessonQuestion,
    shuffleArray
  };
})(window);
