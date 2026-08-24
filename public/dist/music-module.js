// ==================== CATALOGO DE MUSICAS ====================
(function initMusicModule(window){
  const SONGS={
    'blinding-lights':{title:'Blinding Lights',artist:'The Weeknd',ytId:'4NRXx6U8ABQ',level:'Intermediário',lyrics:[
      {en:"I've been tryna call",pt:"Eu fico tentando te ligar",explain:"<strong>tryna</strong> = trying to (gíria super comum). <strong>call</strong> = ligar (telefone). Ex: <em>'I'm tryna call him'</em> = Estou tentando ligar pra ele."},
      {en:"I've been on my own for long enough",pt:"Fiquei sozinho por tempo suficiente",explain:"<strong>on my own</strong> = sozinho, por conta própria. <strong>long enough</strong> = tempo suficiente."},
      {en:"Maybe you can show me how to love, maybe",pt:"Talvez você possa me mostrar como amar",explain:"<strong>show me how to</strong> = me mostrar como. Estrutura muito útil! <em>'Show me how to do this'</em>."},
      {en:"I'm drowning in the night",pt:"Estou me afogando na noite",explain:"<strong>drowning in</strong> = afogado em (metáfora). <em>'I'm drowning in work'</em> = Estou afogado no trabalho."},
      {en:"Oh, can't you hear me yelling at the sky?",pt:"Ah, você não pode me ouvir gritando para o céu?",explain:"<strong>yelling</strong> = gritando intensamente. <strong>Can't you</strong> = você não pode? Tom de frustração."},
      {en:"I said, ooh, I'm blinded by the lights",pt:"Eu disse, ooh, estou cego pelas luzes",explain:"<strong>blinded by</strong> = cegado por. Metáfora para deslumbramento. <em>'Blinded by love'</em> = Cego de amor."},
      {en:"No, I can't sleep until I feel your touch",pt:"Não, não consigo dormir até sentir seu toque",explain:"<strong>can't sleep until</strong> = não consigo dormir até. <strong>feel your touch</strong> = sentir seu toque."},
      {en:"I said, ooh, I'm drowning in the night",pt:"Estou me afogando na noite",explain:"Refrão repetido — perfeito para treinar reconhecimento auditivo!"}
    ]},
    'shape-of-you':{title:'Shape of You',artist:'Ed Sheeran',ytId:'JGwWNGJdvx8',level:'Iniciante',lyrics:[
      {en:"The club isn't the best place to find a lover",pt:"O clube não é o melhor lugar para encontrar um amor",explain:"<strong>isn't the best place to</strong> = não é o melhor lugar para. <strong>lover</strong> = parceiro romântico."},
      {en:"So the bar is where I go",pt:"Então o bar é onde eu vou",explain:"<strong>where I go</strong> = onde eu vou. Cláusula relativa simples."},
      {en:"Me and my friends at the table doing shots",pt:"Eu e meus amigos na mesa tomando shots",explain:"<strong>doing shots</strong> = tomando doses de bebida. Uso do gerúndio para ações simultâneas."},
      {en:"Drinking faster and then we talk slow",pt:"Bebendo mais rápido e então falamos devagar",explain:"<strong>talk slow</strong> (informal para slowly). Inglês coloquial de propósito!"},
      {en:"Come over and start up a conversation with just me",pt:"Venha e comece uma conversa comigo",explain:"<strong>come over</strong> = se aproximar. <strong>start up a conversation</strong> = iniciar conversa. Phrasal verb!"},
      {en:"I'm in love with the shape of you",pt:"Estou apaixonado pela sua forma",explain:"<strong>in love with</strong> = apaixonado por. <strong>shape</strong> = forma, figura."},
      {en:"We push and pull like a magnet do",pt:"Nos atraímos e repelimos como um ímã faz",explain:"<strong>push and pull</strong> = empurrar e puxar. Metáfora para atração em relacionamentos."},
      {en:"I'm in love with your body",pt:"Estou apaixonado pelo seu corpo",explain:"Refrão mais simples e direto. <strong>body</strong> = corpo. Vocabulário essencial."}
    ]},
    'someone-like-you':{title:'Someone Like You',artist:'Adele',ytId:'hLQl3WQQoQ0',level:'Intermediário',lyrics:[
      {en:"I heard that you're settled down",pt:"Ouvi dizer que você se estabeleceu",explain:"<strong>heard that</strong> = ouvi dizer que. <strong>settled down</strong> = estabeleceu-se (casar, ter filhos). Phrasal verb!"},
      {en:"That you found a girl and you're married now",pt:"Que você encontrou uma garota e está casado",explain:"<strong>found a girl</strong> = encontrou uma garota. Passado simples para fatos."},
      {en:"I hate to turn up out of the blue, unsolicited",pt:"Odeio aparecer do nada, sem ser convidada",explain:"<strong>out of the blue</strong> = do nada, de surpresa. Expressão idiomática muito usada!"},
      {en:"But I couldn't stay away, I couldn't fight it",pt:"Mas eu não conseguia ficar longe, não conseguia resistir",explain:"<strong>stay away</strong> = ficar longe. <strong>fight it</strong> = resistir."},
      {en:"Never mind, I'll find someone like you",pt:"Não importa, vou encontrar alguém como você",explain:"<strong>never mind</strong> = não importa, deixa pra lá. Expressão muito útil!"},
      {en:"I wish nothing but the best for you",pt:"Desejo apenas o melhor para você",explain:"<strong>wish nothing but the best</strong> = desejar apenas o melhor. Expressão elegante de despedida."},
      {en:"Don't forget me, I beg",pt:"Não me esqueça, imploro",explain:"<strong>don't forget</strong> = não esqueça. <strong>I beg</strong> = eu imploro."},
      {en:"I'll remember you said sometimes it lasts in love",pt:"Vou lembrar que você disse que às vezes o amor dura",explain:"<strong>sometimes it lasts</strong> = às vezes dura. Filosofia simples em inglês direto."}
    ]},
    'stay':{title:'Stay',artist:'The Kid LAROI & Justin Bieber',ytId:'kTJczUoc26U',level:'Iniciante',lyrics:[
      {en:"I do the same thing I told you that I never would",pt:"Faço a mesma coisa que disse que nunca faria",explain:"<strong>the same thing I told you</strong> = a mesma coisa que disse. <strong>never would</strong> = nunca faria."},
      {en:"I told you I changed, even when I knew I never could",pt:"Disse que mudei, mesmo sabendo que nunca conseguiria",explain:"<strong>even when</strong> = mesmo quando. <strong>never could</strong> = nunca conseguiria."},
      {en:"I need to stop, but I can't, ain't no way",pt:"Preciso parar, mas não consigo, não tem jeito",explain:"<strong>ain't no way</strong> = não tem jeito (gíria). <em>Ain't = am not/is not/are not</em>. Muito usado em músicas!"},
      {en:"Wait a minute, let me finish, I know you're pissed",pt:"Espera um minuto, deixa eu terminar, sei que você está com raiva",explain:"<strong>let me finish</strong> = deixa eu terminar. <strong>pissed</strong> = com raiva (gíria americana)."},
      {en:"Can't keep running away, I keep on waiting",pt:"Não posso continuar fugindo, continuo esperando",explain:"<strong>keep running away</strong> = continuar fugindo. <strong>keep on + gerúndio</strong> = continuar fazendo."},
      {en:"I just need you to stay",pt:"Só preciso que você fique",explain:"<strong>need you to stay</strong> = preciso que você fique. Estrutura: <em>need + alguém + to + verbo</em>."},
      {en:"Why do you keep on making me feel this way?",pt:"Por que você continua me fazendo sentir assim?",explain:"<strong>keep on making</strong> = continua fazendo. <strong>make someone feel</strong> = fazer alguém sentir."},
      {en:"I don't want to be in love",pt:"Eu não quero estar apaixonado",explain:"<strong>don't want to be</strong> = não quero estar. <strong>in love</strong> = apaixonado."}
    ]}
  };

  const SUGGESTION_LIBRARY=[
    {key:'blinding-lights',title:'Blinding Lights',artist:'The Weeknd',ytId:'4NRXx6U8ABQ',level:'Intermediário',thumb:'🌃'},
    {key:'shape-of-you',title:'Shape of You',artist:'Ed Sheeran',ytId:'JGwWNGJdvx8',level:'Iniciante',thumb:'🎸'},
    {key:'someone-like-you',title:'Someone Like You',artist:'Adele',ytId:'hLQl3WQQoQ0',level:'Intermediário',thumb:'🎹'},
    {key:'stay',title:'Stay',artist:'The Kid LAROI & Justin Bieber',ytId:'kTJczUoc26U',level:'Iniciante',thumb:'🎤'},
    {key:'hello',title:'Hello',artist:'Adele',ytId:'YQHsXMglC9A',level:'Intermediário',thumb:'📞'},
    {key:'believer',title:'Believer',artist:'Imagine Dragons',ytId:'7wtfhZwyrcc',level:'Intermediário',thumb:'🥁'},
    {key:'counting-stars',title:'Counting Stars',artist:'OneRepublic',ytId:'hT_nvWreIhg',level:'Intermediário',thumb:'⭐'},
    {key:'just-the-way-you-are',title:'Just the Way You Are',artist:'Bruno Mars',ytId:'LjhCEhWiKXk',level:'Iniciante',thumb:'💫'},
    {key:'all-of-me',title:'All of Me',artist:'John Legend',ytId:'450p7goxZqg',level:'Intermediário',thumb:'🎼'},
    {key:'sugar',title:'Sugar',artist:'Maroon 5',ytId:'09R8_2nJtjg',level:'Iniciante',thumb:'🍬'},
    {key:'levitating',title:'Levitating',artist:'Dua Lipa',ytId:'TUVcZfQe-Kw',level:'Intermediário',thumb:'🪩'},
    {key:'yellow',title:'Yellow',artist:'Coldplay',ytId:'yKNxeF4KMsY',level:'Iniciante',thumb:'🌼'}
  ];

  const SONG_ALIASES={
    'blinding-lights':['blinding lights','the weeknd blinding lights'],
    'shape-of-you':['shape of you','ed sheeran shape of you'],
    'someone-like-you':['someone like you','adele someone like you'],
    'stay':['stay','the kid laroi stay','justin bieber stay','stay kid laroi']
  };

  const FAVORITE_ICONS=['🎵','🎸','🎹','🎤','🎶'];

  function fallbackNormalizeSongText(value){
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalize(value){
    return typeof window.normalizeSongText === 'function'
      ? window.normalizeSongText(value)
      : fallbackNormalizeSongText(value);
  }

  function getAvailableSongsText(){
    return Object.values(SONGS).map(song=>song.title).join(', ');
  }

  function getSuggestionByKey(key){
    return SUGGESTION_LIBRARY.find(suggestion=>suggestion.key===key) || null;
  }

  function findSongByQuery(query){
    const normalizedQuery=normalize(query);
    if(!normalizedQuery || normalizedQuery.length < 2) return null;

    let best=null;
    let bestScore=-1;
    const queryWords=normalizedQuery.split(/\s+/).filter(word=>word.length>=1);

    for(const [key,song] of Object.entries(SONGS)){
      const title=normalize(song.title);
      const artist=normalize(song.artist);
      const combo=normalize(`${song.title} ${song.artist}`);
      const aliases=(SONG_ALIASES[key]||[]).map(alias=>normalize(alias));
      const allCandidates=[title,combo,artist,...aliases];
      let score=-1;

      if(allCandidates.some(candidate=>candidate===normalizedQuery)) score=100;
      else if(combo.includes(normalizedQuery)||title.includes(normalizedQuery)||artist.includes(normalizedQuery)) score=95;
      else if(title.includes(queryWords.join(' '))||combo.includes(queryWords.join(' '))) score=92;
      else {
        const matchedWords=queryWords.filter(word=>title.includes(word)||artist.includes(word));
        if(matchedWords.length===queryWords.length&&queryWords.length>=2) score=80;
        else if(matchedWords.length>=2){
          const ratio=matchedWords.length/queryWords.length;
          if(ratio>=0.8) score=75;
          else if(ratio>=0.6) score=60;
          else if(ratio>=0.5) score=40;
        }
      }

      if(score<40&&queryWords.length===1){
        if(allCandidates.some(candidate=>candidate.startsWith(queryWords[0]+' ')||candidate===queryWords[0])) score=50;
      }

      if(score>bestScore){
        bestScore=score;
        best=[key,song];
      }
    }

    return bestScore>=35 ? best : null;
  }

  window.LinguaFireMusic={
    FAVORITE_ICONS,
    SONGS,
    SONG_ALIASES,
    SUGGESTION_LIBRARY,
    findSongByQuery,
    getAvailableSongsText,
    getSuggestionByKey
  };
})(window);
