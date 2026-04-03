
// ==================== ESTADO ====================
let state={name:'',xp:0,level:1,streak:0,lives:5,totalCorrect:0,totalLessons:0,achievements:[],lastPlayed:null,weeklyXp:120,englishLevel:'',favorites:[]};
const LEVELS_APP=[{level:1,name:'Iniciante',xpNeeded:200},{level:2,name:'Aprendiz',xpNeeded:400},{level:3,name:'Explorador',xpNeeded:700},{level:4,name:'Comunicador',xpNeeded:1200},{level:5,name:'Fluente',xpNeeded:2000}];
const ACHIEVEMENTS_DEF=[{id:'first',icon:'🌟',name:'Primeira lição!'},{id:'streak3',icon:'🔥',name:'3 dias seguidos'},{id:'xp100',icon:'⚡',name:'Centurião — 100 XP'},{id:'perfect',icon:'💎',name:'Perfeito!'},{id:'music',icon:'🎵',name:'Amante de músicas'},{id:'lessons5',icon:'📚',name:'5 lições completas'},{id:'xp500',icon:'🏆',name:'500 XP acumulados'}];
const RANKING_PLAYERS=[{name:'Marcos R.',xp:1820,avatar:'🦁'},{name:'Julia F.',xp:1560,avatar:'🦊'},{name:'Pedro H.',xp:1340,avatar:'🐺'},{name:'Ana C.',xp:980,avatar:'🦋'},{name:'Carlos M.',xp:720,avatar:'🐯'}];
const LEVEL_RESULTS={A1:{emoji:'🌱',name:'A1 — Iniciante',desc:'Você está começando! Foco nas bases: vocabulário simples, saudações e frases do dia a dia. Com prática diária você evolui rápido!',color:'#00ff88'},A2:{emoji:'🌿',name:'A2 — Básico',desc:'Você já conhece o básico! Hora de expandir vocabulário e praticar conversas simples. Vá na aba de músicas!',color:'#00d4ff'},B1:{emoji:'🌳',name:'B1 — Intermediário',desc:'Parabéns! Você já se vira em inglês. Foque em expressões idiomáticas, gírias e fluência.',color:'#ffcc00'},B2:{emoji:'🦅',name:'B2 — Intermediário Alto',desc:'Impressionante! Você domina bem o inglês. Polindo vocabulário avançado e nuances de escrita.',color:'#ff8c00'},C1:{emoji:'🏆',name:'C1 — Avançado',desc:'Nível avançado! Você domina o inglês. Foque em literaturas, sotaques e expressões sofisticadas.',color:'#ff4d00'}};
const $ = (id)=>document.getElementById(id);
const $$ = (selector, root=document)=>Array.from(root.querySelectorAll(selector));
const FAVORITE_ICONS=['🎵','🎸','🎹','🎤','🎶'];
const YOUTUBE_EMBED_BASE='https://www.youtube-nocookie.com/embed';

function setVisible(id, visible){
  $(id).classList.toggle('is-hidden', !visible);
}

function setWidth(id, value){
  $(id).style.width=value;
}

function isLocalFileContext(){
  return window.location.protocol==='file:';
}

function getYouTubeWatchUrl(ytId){
  return `https://www.youtube.com/watch?v=${ytId}`;
}

function renderVideoPlayer(song){
  const videoWrap=$('videoWrap');

  if(isLocalFileContext()){
    videoWrap.innerHTML=`
      <div class="video-fallback">
        <div class="video-fallback-icon">▶</div>
        <h3>Video indisponivel no modo arquivo</h3>
        <p>O YouTube bloqueia embeds quando a pagina esta aberta por <code>file://</code>. A letra e a traducao continuam funcionando normalmente.</p>
        <a class="video-fallback-link" href="${getYouTubeWatchUrl(song.ytId)}" target="_blank" rel="noopener noreferrer">Abrir video no YouTube</a>
      </div>
    `;
    return;
  }

  videoWrap.innerHTML=`<iframe src="${YOUTUBE_EMBED_BASE}/${song.ytId}?rel=0&modestbranding=1" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;
}

// ==================== TESTE DE NIVELAMENTO ====================
// Banco completo de perguntas para cada nível
const PT_Q_ALL={
  A1:[
    {text:'What is "Casa" in English?',choices:['House','Car','Tree','Dog'],correct:0},
    {text:'Choose: "I ___ a student."',hint:'Verbo to be',choices:['am','is','are','be'],correct:0},
    {text:'What does "Beautiful" mean?',choices:['Bonito/Linda','Feio','Grande','Pequeno'],correct:0},
    {text:'How do you say "Água" in English?',choices:['Water','Fire','Food','Milk'],correct:0},
    {text:'Complete: "The sky is ___"',choices:['blue','red','big','small'],correct:0},
    {text:'What does "Happy" mean?',choices:['Feliz','Triste','Com raiva','Cansado'],correct:0},
    {text:'Choose the correct: "She ___ a teacher."',choices:['is','are','am','be'],correct:0},
    {text:'How do you say "Maçã" in English?',choices:['Apple','Orange','Banana','Grape'],correct:0},
    {text:'What is "Book" in Portuguese?',choices:['Livro','Mesa','Cadeira','Porta'],correct:0},
    {text:'Complete: "I have two ___"',choices:['cats','cat','the cat','catss'],correct:0},
    {text:'What does "Mother" mean?',choices:['Mãe','Pai','Irmão','irmã'],correct:0},
    {text:'How do you say "Sol" in English?',choices:['Sun','Moon','Star','Sky'],correct:0},
    {text:'Choose: "This is ___ apple."',choices:['an','a','the','is'],correct:0},
    {text:'What does "School" mean?',choices:['Escola','Casa','Hospital','Loja'],correct:0},
    {text:'Complete: "I ___ 25 years old."',choices:['am','is','are','be'],correct:0},
    {text:'How do you say "Pão" in English?',choices:['Bread','Rice','Meat','Cheese'],correct:0},
    {text:'What does "Friend" mean?',choices:['Amigo','Inimigo','Família','Professor'],correct:0},
    {text:'Choose the correct: "They ___ students."',choices:['are','is','am','be'],correct:0},
    {text:'What is "Dog" in Portuguese?',choices:['Cachorro','Gato','Pássaro','Peixe'],correct:0},
    {text:'Complete: "The cat is on the ___"',choices:['table','window','car','tree'],correct:0}
  ],
  A2:[
    {text:'Choose the correct sentence:',hint:'Presente contínuo',choices:['She is running fast','She running fast','She run fast','She runs fast now'],correct:0},
    {text:'"I have been here ___ Monday."',choices:['since','for','from','at'],correct:0},
    {text:'What does "Nevertheless" mean?',hint:'Palavra de contraste',choices:['No entanto','Portanto','Além disso','Finalmente'],correct:0},
    {text:'Complete: "She ___ to the gym every day."',choices:['goes','go','going','went'],correct:0},
    {text:'"I ___ my keys yesterday."',choices:['lost','lose','losing','loss'],correct:0},
    {text:'What does "However" mean?',choices:['No entanto','Também','Portanto','Porque'],correct:0},
    {text:'Choose: "There are ___ people in the room."',choices:['many','much','some','few'],correct:0},
    {text:'"She has ___ finished her homework."',choices:['already','still','yet','never'],correct:0},
    {text:'What does "However" mean?',choices:['Todavia','Consequentemente','Além disso','Por exemplo'],correct:0},
    {text:'Complete: "If I ___ time, I will call you."',choices:['have','has','had','having'],correct:0},
    {text:'"I am looking forward ___ hearing from you."',choices:['to','for','in','at'],correct:0},
    {text:'What does "Eventually" mean?',choices:['Eventualmente','Frequentemente','Raramente','Sempre'],correct:0},
    {text:'Choose: "He is interested ___ learning English."',choices:['in','on','at','to'],correct:0},
    {text:'"The movie was ___ interesting than the book."',choices:['more','most','much','many'],correct:0},
    {text:'What does "Furthermore" mean?',choices:['Além disso','No entanto','Por exemplo','Porque'],correct:0},
    {text:'Complete: "She ___ speak three languages."',choices:['can','cans','canned','canning'],correct:0},
    {text:'"I have been waiting for you ___ two hours."',choices:['for','since','during','while'],correct:0},
    {text:'What does "Meanwhile" mean?',choices:['Enquanto isso','Depois disso','Antes disso','Finalmente'],correct:0},
    {text:'Choose: "The weather is ___ today."',choices:['nice','well','goodly','greatly'],correct:0},
    {text:'"I would like ___ coffee, please."',choices:['some','any','many','much'],correct:0}
  ],
  B1:[
    {text:'Complete: "If I ___ rich, I would travel the world."',hint:'Condicional hipotético',choices:['were','am','will be','be'],correct:0},
    {text:'"She\'s been working here ___ five years."',choices:['for','since','during','while'],correct:0},
    {text:'What\'s the meaning of "Break a leg"?',hint:'Expressão idiomática',choices:['Boa sorte!','Machuque-se','Corra!','Descanse'],correct:0},
    {text:'Choose: "By the time I arrived, she ___"',choices:['had left','has left','left','was leaving'],correct:0},
    {text:'"I wish I ___ more time."',choices:['had','have','has','having'],correct:0},
    {text:'What does "Hit the books" mean?',choices:['Estudar muito','Bater em livros','Comprar livros','Ler rápido'],correct:0},
    {text:'Complete: "If I ___ you, I would accept the offer."',choices:['were','am','was','be'],correct:0},
    {text:'"She insisted ___ seeing the manager."',choices:['on','in','at','for'],correct:0},
    {text:'What does "Spill the beans" mean?',choices:['Contar um segredo','Derramar feijões','Falar demais','Pedir desculpas'],correct:0},
    {text:'Choose: "I\'m looking forward ___ the concert."',choices:['to','in','at','for'],correct:0},
    {text:'"The teacher made us ___ the assignment."',choices:['complete','to complete','completing','completed'],correct:0},
    {text:'What does "Piece of cake" mean?',choices:['Algo fácil','Um bolo','Um pedaço','Experimente'],correct:0},
    {text:'Complete: "She suggested ___ to the beach."',choices:['going','go','to go','went'],correct:0},
    {text:'"I used to ___ coffee every morning."',choices:['drink','drinks','drinking','drank'],correct:0},
    {text:'What does "Cost an arm and a leg" mean?',choices:['Ser muito caro','Perder membros','Receber muito','Gastar poco'],correct:0},
    {text:'Choose: "He denies ___ the money."',choices:['stealing','steal','stolen','to steal'],correct:0},
    {text:'"She admitted ___ the truth."',choices:['telling','tell','told','to tell'],correct:0},
    {text:'What does "Under the weather" mean?',choices:['Me sentindo mal','No tempo','Sob o céu','Com tempo'],correct:0},
    {text:'Complete: "I\'d rather ___ at home tonight."',choices:['stay','staying','stayed','to stay'],correct:0},
    {text:'"She avoid ___ eye contact with him."',choices:['making','make','made','to make'],correct:0}
  ],
  B2:[
    {text:'Correct passive voice: "They built the bridge in 1920."',choices:['The bridge was built in 1920','The bridge built in 1920','The bridge has built','The bridge is built in 1920'],correct:0},
    {text:'"Had I known, I ___ differently."',hint:'Condicional invertido',choices:['would have acted','would act','will act','acted'],correct:0},
    {text:'What does "Ambiguous" mean?',choices:['Com duplo sentido','Claro e direto','Muito importante','Surpreendente'],correct:0},
    {text:'Choose: "Not only ___ the exam, but she also got the highest score."',choices:['did she pass','she passed','she pass','passed she'],correct:0},
    {text:'"The evidence points ___ the suspect being guilty."',choices:['to','at','for','in'],correct:0},
    {text:'What does "It slips my mind" mean?',choices:['Esqueci momentaneamente','Escorregou','Deslizou','Pensei'],correct:0},
    {text:'Complete: "Were it ___ the rain, we would have gone."',choices:['not for','for','because','due'],correct:0},
    {text:'"She has a reputation ___ honesty."',choices:['for','of','to','in'],correct:0},
    {text:'What does "A dime a dozen" mean?',choices:['Muito comum','Barato','Caro','Raro'],correct:0},
    {text:'Choose: "___ I were you, I would reconsider."',choices:['Were','Was','Am','Be'],correct:0},
    {text:'"His behavior fell short ___ expectations."',choices:['of','to','from','in'],correct:0},
    {text:'What does "Bite the bullet" mean?',choices:['Enfrentar com coragem','Morder balas','Atirar','Fugir'],correct:0},
    {text:'Complete: "But for his help, we ___"',choices:['would have failed','would fail','failed','fail'],correct:0},
    {text:'"She prides herself ___ her academic achievements."',choices:['on','in','at','with'],correct:0},
    {text:'What does "Cut to the chase" mean?',choices:['Ir direto ao ponto','Perseguir','Cortar','Caçar'],correct:0},
    {text:'Choose: "Never ___ such a beautiful sunset."',choices:['have I seen','I have seen','I seen','Seen I'],correct:0},
    {text:'"The findings are indicative ___ a larger problem."',choices:['of','to','for','in'],correct:0},
    {text:'What does "At the drop of a hat" mean?',choices:['Imediatamente','Usar chapéu','Esperar','Recusar'],correct:0},
    {text:'Complete: "Had it not been for the scholarship, I ___"',choices:['would not have studied','would not study','studied','had studied'],correct:0},
    {text:'"The new policy is conducive ___ learning."',choices:['to','for','in','at'],correct:0}
  ],
  C1:[
    {text:'"The proposal met with considerable ___, particularly from senior staff."',hint:'Escolha a mais precisa',choices:['resistance','refusing','opposing','against'],correct:0},
    {text:'Which is grammatically correct?',hint:'Inversão formal',choices:['Rarely do I encounter such skill','Rarely I encounter such skill','I rarely do encounter skill','Such skill I rarely encounter'],correct:0},
    {text:'"Ubiquitous" most closely means:',choices:['Present everywhere','Extremely large','Very important','Deeply confusing'],correct:0},
    {text:'"His rhetoric belied his true ___."',choices:['intentions','intention','intending','intent'],correct:0},
    {text:'What does "Proliferate" mean?',choices:['Multiplicar-se rapidamente','Desaparecer','Permanecer','Diminuir'],correct:0},
    {text:"Choose: \"___ the company's success, many employees remained skeptical.\"",choices:['Despite','Although','However','Nevertheless'],correct:0},
    {text:'"The findings are not ___ with previous research."',choices:['consistent','consisted','consistency','consist'],correct:0},
    {text:'What does "Ephemeral" mean?',choices:['Passageiro/Efêmero','Perene','Importante','Complexo'],correct:0},
    {text:'"She wielded considerable ___ within the organization."',choices:['influence','influencing','influential','influenceful'],correct:0},
    {text:'Choose: "Not until ___ the full implications that ___ solutions became apparent."',choices:['we understood; systemic','understand; systems','understood; systematic','understanding; system'],correct:0},
    {text:'What does "Circumlocution" mean?',choices:['Usar muitas palavras para dizer pouco','Falar diretamente','Silêncio','Resposta curta'],correct:0},
    {text:'"The ambiguity ___ the contract led to disputes."',choices:['in','of','to','with'],correct:0},
    {text:'Choose: "Were it not for the economic downturn, the company ___"',choices:['would have thrived','would thrive','thrived','thrive'],correct:0},
    {text:'"Her argument was ___ by solid evidence."',choices:['substantiated','substantiate','substantiating','substance'],correct:0},
    {text:'What does "Zeitgeist" mean?',choices:['Espírito da época','Bom momento','Tempo bom','Esperança'],correct:0},
    {text:'"The policy is not ___ with international standards."',choices:['congruent','congruence','congruously','congruity'],correct:0},
    {text:'What does "Obfuscate" mean?',choices:['Tornar obscuro/confuso','Esclarecer','Ignorar','Simplificar'],correct:0},
    {text:'Choose: "Only after ___ the data did we realize ___ patterns existed."',choices:['analyzing; systemic','analyse; systemical','analysis; system','analyzed; systematic'],correct:0},
    {text:'"The phenomenon remains ___ understood."',choices:['poorly','poor','scarcity','scarcely'],correct:0},
    {text:'What does "Antediluvian" mean?',choices:['Extremamente antigo/outdated','Muito moderno','Atual','Raro'],correct:0}
  ]
};

// Função para embaralhar array
function shuffleArray(arr){
  const shuffled=[...arr];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return shuffled;
}

// Selecionar perguntas aleatórias balanceadas
function getRandomPlacementQuestions(count=15){
  const allQ=[];
  const levels=['A1','A2','B1','B2','C1'];
  const perLevel=Math.ceil(count/levels.length);
  levels.forEach(lvl=>{
    const shuffled=shuffleArray(PT_Q_ALL[lvl]);
    shuffled.slice(0,perLevel).forEach(q=>{
      const correctAnswer=q.choices[q.correct];
      const shuffledChoices=shuffleArray([...q.choices]);
      const shuffledCorrectIndex=shuffledChoices.indexOf(correctAnswer);

      allQ.push({
        ...q,
        choices:shuffledChoices,
        correct:shuffledCorrectIndex,
        level:lvl,
        color:getPTColor(lvl)
      });
    });
  });
  return shuffleArray(allQ).slice(0,count);
}
function getPTColor(lvl){const c={A1:'#00ff88',A2:'#00d4ff',B1:'#ffcc00',B2:'#ff8c00',C1:'#ff4d00'};return c[lvl]||'#00ff88';}

let PT_Q=[],ptCurrent=0,ptCorrect=0,ptStartTime=0,ptAnswered=false;

function goToPlacement(){
  const name=$('nameInput').value.trim();
  if(!name){$('nameInput').focus();$('nameInput').style.borderColor='var(--pink)';setTimeout(()=>$('nameInput').style.borderColor='',1000);return;}
  state.name=name;
  PT_Q=getRandomPlacementQuestions(15); // 15 perguntas aleatórias diferentes a cada vez
  ptCurrent=0;ptCorrect=0;ptAnswered=false;ptStartTime=Date.now();
  setVisible('pt-q-wrap', true);
  setVisible('pt-progress-wrap', true);
  setVisible('pt-result', false);
  showScreen('placement');renderPTQ();
}
function renderPTQ(){
  const q=PT_Q[ptCurrent];
  const pct=(ptCurrent/PT_Q.length)*100;
  setWidth('ptBar', pct+'%');
  $('ptCount').textContent=`${ptCurrent} / ${PT_Q.length}`;
  const badge=$('pt-badge');
  const color=getPTColor(q.level);
  badge.textContent=`Nível ${q.level}`;badge.style.background=color+'22';badge.style.color=color;badge.style.border=`1px solid ${color}55`;
  $('pt-qtext').textContent=q.text;
  $('pt-hint').textContent=q.hint||'';
  const choices=$('pt-choices');choices.innerHTML='';ptAnswered=false;
  const letters=['A','B','C','D'];
  q.choices.forEach((ch,i)=>{const btn=document.createElement('button');btn.className='pt-choice';btn.innerHTML=`<span class="pt-letter">${letters[i]}</span>${ch}`;btn.addEventListener('click',()=>{if(!ptAnswered)selectPTA(i,btn,q);});choices.appendChild(btn);});
}
function selectPTA(idx,btn,q){
  ptAnswered=true;
  $$('.pt-choice').forEach(b=>b.style.pointerEvents='none');
  if(idx===q.correct){ptCorrect++;btn.classList.add('correct');}
  else{btn.classList.add('wrong');$$('.pt-choice')[q.correct].classList.add('correct');}
  setTimeout(()=>{ptCurrent++;if(ptCurrent>=PT_Q.length)showPTResult();else renderPTQ();},900);
}
function showPTResult(){
  const elapsed=Math.round((Date.now()-ptStartTime)/1000);
  const score=Math.round((ptCorrect/PT_Q.length)*100);
  let lvl='A1';
  if(score>=90)lvl='C1';else if(score>=73)lvl='B2';else if(score>=53)lvl='B1';else if(score>=33)lvl='A2';
  state.englishLevel=lvl;
  setVisible('pt-q-wrap', false);
  setVisible('pt-progress-wrap', false);
  $('pt-title').textContent='🎉 Seu resultado!';
  $('pt-sub').textContent='Seu nível de inglês foi identificado:';
  const res=LEVEL_RESULTS[lvl];
  $('res-emoji').textContent=res.emoji;
  $('res-level').textContent=res.name;
  $('res-level').style.color=res.color;
  $('res-desc').textContent=res.desc;
  $('res-correct').textContent=ptCorrect;
  $('res-score').textContent=score+'%';
  $('res-time').textContent=elapsed+'s';
  setVisible('pt-result', true);
}
function enterApp(){saveState();showScreen('app');updateUI();}

// ==================== MOTOR DE MÚSICA ====================
const SONGS={
  'blinding-lights':{title:'Blinding Lights',artist:'The Weeknd',ytId:'4NRXx6U8ABQ',level:'Intermediário',lyrics:[
    {en:"I've been tryna call",pt:"Eu fico tentando te ligar",explain:"<strong>tryna</strong> = trying to (gíria super comum). <strong>call</strong> = ligar (telefone). Ex: <em>'I'm tryna call him'</em> = Estou tentando ligar pra ele."},
    {en:"I've been on my own for long enough",pt:"Fiquei sozinho por tempo suficiente",explain:"<strong>on my own</strong> = sozinho, por conta própria. <strong>long enough</strong> = tempo suficiente."},
    {en:"Maybe you can show me how to love, maybe",pt:"Talvez você possa me mostrar como amar",explain:"<strong>show me how to</strong> = me mostrar como. Estrutura muito útil! <em>'Show me how to do this'</em>."},
    {en:"I'm drowning in the night",pt:"Estou me afogando na noite",explain:"<strong>drowning in</strong> = afogado em (metáfora). <em>'I'm drowning in work'</em> = Estou afogado no trabalho."},
    {en:"Oh, can't you hear me yelling at the sky?",pt:"Ah, você não pode me ouvir gritando para o céu?",explain:"<strong>yelling</strong> = gritando intensamente. <strong>Can't you</strong> = você não pode? Tom de frustração."},
    {en:"I said, ooh, I'm blinded by the lights",pt:"Eu disse, ooh, estou cego pelas luzes",explain:"<strong>blinded by</strong> = cegado por. Metáfora para deslumbramento. <em>'Blinded by love'</em> = Cego de amor."},
    {en:"No, I can't sleep until I feel your touch",pt:"Não, não consigo dormir até sentir seu toque",explain:"<strong>can't sleep until</strong> = não consigo dormir até. <strong>feel your touch</strong> = sentir seu toque."},
    {en:"I said, ooh, I'm drowning in the night",pt:"Estou me afogando na noite",explain:"Refrão repetido — perfeito para treinar reconhecimento auditivo!"},
  ]},
  'shape-of-you':{title:'Shape of You',artist:'Ed Sheeran',ytId:'JGwWNGJdvx8',level:'Iniciante',lyrics:[
    {en:"The club isn't the best place to find a lover",pt:"O clube não é o melhor lugar para encontrar um amor",explain:"<strong>isn't the best place to</strong> = não é o melhor lugar para. <strong>lover</strong> = parceiro romântico."},
    {en:"So the bar is where I go",pt:"Então o bar é onde eu vou",explain:"<strong>where I go</strong> = onde eu vou. Cláusula relativa simples."},
    {en:"Me and my friends at the table doing shots",pt:"Eu e meus amigos na mesa tomando shots",explain:"<strong>doing shots</strong> = tomando doses de bebida. Uso do gerúndio para ações simultâneas."},
    {en:"Drinking faster and then we talk slow",pt:"Bebendo mais rápido e então falamos devagar",explain:"<strong>talk slow</strong> (informal para slowly). Inglês coloquial de propósito!"},
    {en:"Come over and start up a conversation with just me",pt:"Venha e comece uma conversa comigo",explain:"<strong>come over</strong> = se aproximar. <strong>start up a conversation</strong> = iniciar conversa. Phrasal verb!"},
    {en:"I'm in love with the shape of you",pt:"Estou apaixonado pela sua forma",explain:"<strong>in love with</strong> = apaixonado por. <strong>shape</strong> = forma, figura."},
    {en:"We push and pull like a magnet do",pt:"Nos atraímos e repelimos como um ímã faz",explain:"<strong>push and pull</strong> = empurrar e puxar. Metáfora para atração em relacionamentos."},
    {en:"I'm in love with your body",pt:"Estou apaixonado pelo seu corpo",explain:"Refrão mais simples e direto. <strong>body</strong> = corpo. Vocabulário essencial."},
  ]},
  'someone-like-you':{title:'Someone Like You',artist:'Adele',ytId:'hLQl3WQQoQ0',level:'Intermediário',lyrics:[
    {en:"I heard that you're settled down",pt:"Ouvi dizer que você se estabeleceu",explain:"<strong>heard that</strong> = ouvi dizer que. <strong>settled down</strong> = estabeleceu-se (casar, ter filhos). Phrasal verb!"},
    {en:"That you found a girl and you're married now",pt:"Que você encontrou uma garota e está casado",explain:"<strong>found a girl</strong> = encontrou uma garota. Passado simples para fatos."},
    {en:"I hate to turn up out of the blue, unsolicited",pt:"Odeio aparecer do nada, sem ser convidada",explain:"<strong>out of the blue</strong> = do nada, de surpresa. Expressão idiomática muito usada!"},
    {en:"But I couldn't stay away, I couldn't fight it",pt:"Mas eu não conseguia ficar longe, não conseguia resistir",explain:"<strong>stay away</strong> = ficar longe. <strong>fight it</strong> = resistir."},
    {en:"Never mind, I'll find someone like you",pt:"Não importa, vou encontrar alguém como você",explain:"<strong>never mind</strong> = não importa, deixa pra lá. Expressão muito útil!"},
    {en:"I wish nothing but the best for you",pt:"Desejo apenas o melhor para você",explain:"<strong>wish nothing but the best</strong> = desejar apenas o melhor. Expressão elegante de despedida."},
    {en:"Don't forget me, I beg",pt:"Não me esqueça, imploro",explain:"<strong>don't forget</strong> = não esqueça. <strong>I beg</strong> = eu imploro."},
    {en:"I'll remember you said sometimes it lasts in love",pt:"Vou lembrar que você disse que às vezes o amor dura",explain:"<strong>sometimes it lasts</strong> = às vezes dura. Filosofia simples em inglês direto."},
  ]},
  'stay':{title:'Stay',artist:'The Kid LAROI & Justin Bieber',ytId:'kTJczUoc26U',level:'Iniciante',lyrics:[
    {en:"I do the same thing I told you that I never would",pt:"Faço a mesma coisa que disse que nunca faria",explain:"<strong>the same thing I told you</strong> = a mesma coisa que disse. <strong>never would</strong> = nunca faria."},
    {en:"I told you I changed, even when I knew I never could",pt:"Disse que mudei, mesmo sabendo que nunca conseguiria",explain:"<strong>even when</strong> = mesmo quando. <strong>never could</strong> = nunca conseguiria."},
    {en:"I need to stop, but I can't, ain't no way",pt:"Preciso parar, mas não consigo, não tem jeito",explain:"<strong>ain't no way</strong> = não tem jeito (gíria). <em>Ain't = am not/is not/are not</em>. Muito usado em músicas!"},
    {en:"Wait a minute, let me finish, I know you're pissed",pt:"Espera um minuto, deixa eu terminar, sei que você está com raiva",explain:"<strong>let me finish</strong> = deixa eu terminar. <strong>pissed</strong> = com raiva (gíria americana)."},
    {en:"Can't keep running away, I keep on waiting",pt:"Não posso continuar fugindo, continuo esperando",explain:"<strong>keep running away</strong> = continuar fugindo. <strong>keep on + gerúndio</strong> = continuar fazendo."},
    {en:"I just need you to stay",pt:"Só preciso que você fique",explain:"<strong>need you to stay</strong> = preciso que você fique. Estrutura: <em>need + alguém + to + verbo</em>."},
    {en:"Why do you keep on making me feel this way?",pt:"Por que você continua me fazendo sentir assim?",explain:"<strong>keep on making</strong> = continua fazendo. <strong>make someone feel</strong> = fazer alguém sentir."},
    {en:"I don't want to be in love",pt:"Eu não quero estar apaixonado",explain:"<strong>don't want to be</strong> = não quero estar. <strong>in love</strong> = apaixonado."},
  ]},
};

let currentSong=null,lyricMode='en',quizQs=[],quizCurrent=0,quizCorrect=0,quizAnswered=false;

function switchMusicTab(tab){
  $('mtab-search').classList.toggle('active',tab==='search');
  $('mtab-favs').classList.toggle('active',tab==='favs');
  setVisible('music-search-panel', tab==='search');
  setVisible('music-favs-panel', tab==='favs');
  if(tab==='favs')renderFavorites();
}
const SONG_ALIASES={
  'blinding-lights':['blinding lights','the weeknd blinding lights'],
  'shape-of-you':['shape of you','ed sheeran shape of you'],
  'someone-like-you':['someone like you','adele someone like you'],
  'stay':['stay','the kid laroi stay','justin bieber stay','stay kid laroi']
};
function getAvailableSongsText(){
  return Object.values(SONGS).map(song=>song.title).join(', ');
}
function normalizeSongText(value=''){
  return value
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/\([^)]*\)|\[[^\]]*\]/g,' ')
    .replace(/official video|official music video|official lyric video|lyrics video|lyric video|audio|video oficial|letra|legendado|tradu[cç][aã]o|feat\.?|ft\.?/g,' ')
    .replace(/[^a-z0-9\s-]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function findSongByQuery(query){
  const normalizedQuery=normalizeSongText(query);
  if(!normalizedQuery)return null;
  let best=null;
  let bestScore=-1;
  for(const [key,song] of Object.entries(SONGS)){
    const candidates=[
      song.title,
      song.artist,
      `${song.title} ${song.artist}`,
      key.replace(/-/g,' '),
      ...(SONG_ALIASES[key]||[])
    ].map(normalizeSongText).filter(Boolean);
    for(const candidate of candidates){
      let score=-1;
      if(candidate===normalizedQuery) score=100;
      else if(candidate.startsWith(normalizedQuery) || normalizedQuery.startsWith(candidate)) score=80;
      else if(candidate.includes(normalizedQuery) || normalizedQuery.includes(candidate)) score=60;
      else {
        const qWords=normalizedQuery.split(' ').filter(Boolean);
        const matched=qWords.filter(word=>candidate.includes(word)).length;
        if(matched) score=matched*10;
      }
      if(score>bestScore){
        bestScore=score;
        best=[key,song];
      }
    }
  }
  return bestScore>=20 ? best : null;
}
function extractYouTubeId(url){
  if(!url) return null;
  const cleaned=url.trim();
  const directId=cleaned.match(/^[a-zA-Z0-9_-]{11}$/);
  if(directId) return directId[0];
  try{
    const parsed=new URL(cleaned);
    const host=parsed.hostname.replace(/^www\./,'');
    if(host==='youtu.be') return parsed.pathname.split('/').filter(Boolean)[0]?.slice(0,11) || null;
    if(host.endsWith('youtube.com') || host.endsWith('music.youtube.com')){
      if(parsed.searchParams.get('v')) return parsed.searchParams.get('v').slice(0,11);
      const parts=parsed.pathname.split('/').filter(Boolean);
      const idx=parts.findIndex(part=>['embed','shorts','live','watch'].includes(part));
      if(idx!==-1 && parts[idx+1]) return parts[idx+1].slice(0,11);
    }
  }catch(_err){}
  const fallback=cleaned.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  return fallback?fallback[1]:null;
}
async function fetchYouTubeTitle(url){
  const endpoints=[
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`
  ];
  for(const endpoint of endpoints){
    try{
      const response=await fetch(endpoint);
      if(!response.ok) continue;
      const data=await response.json();
      if(data && data.title) return data.title;
    }catch(_err){}
  }
  return '';
}
function buildFallbackLyrics(title){
  return [{
    en:`Lyrics were not found automatically for "${title}".`,
    pt:`A letra de "${title}" não foi encontrada automaticamente.`,
    explain:`Tente buscar pelo nome da música. Disponíveis agora: <strong>${getAvailableSongsText()}</strong>.`
  }];
}
function loadSuggestion(key){const s=SONGS[key];if(s)openMusicPlayer(s,key);}
async function loadFromYouTube(){
  const input=document.getElementById('ytLinkInput');
  const url=input.value.trim();
  if(!url){showToast('Cole um link do YouTube!','error');return;}
  const ytId=extractYouTubeId(url);
  if(!ytId){showToast('Link inválido! Use um link do YouTube.','error');return;}
  input.value='';
  
  // Mostrar loading state
  showToast('🔍 Buscando letra...','info');
  
  const foundById=Object.entries(SONGS).find(([_,song])=>song.ytId===ytId);
  if(foundById){openMusicPlayer(foundById[1],foundById[0]);return;}

  let title='Música do YouTube';
  let artist='';
  const fetchedTitle=await fetchYouTubeTitle(url);
  if(fetchedTitle) title=fetchedTitle;
  
  // Primeiro tenta encontrar nos banco local
  const foundByTitle=fetchedTitle ? findSongByQuery(fetchedTitle) : null;
  if(foundByTitle){
    const [key,song]=foundByTitle;
    openMusicPlayer({...song, ytId}, key);
    showToast('Letra encontrada pelo título do vídeo!','success');
    return;
  }

  // Busca letra via LRCLIB API
  const lyricsResult = await window.LyricsService.fetchLyricsForYouTube(ytId, fetchedTitle || title);
  
  if (lyricsResult.success) {
    // Extrai artist do título se possível
    const { trackOriginal, artistOriginal } = window.LyricsService.parseYouTubeTitle(fetchedTitle || title);
    
    // Converte resultado da API para formato do app (com tradução)
    const appLyrics = await window.LyricsService.convertToAppLyrics(lyricsResult, 100);
    
    // Atualiza traduções gradualmente na UI
    setTimeout(() => updateLyricsTranslations(appLyrics), 500);
    
    openMusicPlayer({
      title: trackOriginal || title,
      artist: artistOriginal || 'Artista desconhecido',
      ytId,
      level:'Livre',
      lyrics: appLyrics,
      lyricsSource: lyricsResult.source,
      syncedLyrics: lyricsResult.rawSynced
    }, 'lrclib-'+ytId);
    
    const syncedLabel = lyricsResult.synced ? ' (sincronizada!)' : '';
    const lineCount = lyricsResult.lyrics?.length || 0;
    showToast(`📜 Letra encontrada no ${lyricsResult.source}${syncedLabel} (${lineCount} linhas)`,'success');
    return;
  }
  
  // Não encontrou - mostra mensagem (NÃO gera com IA)
  openMusicPlayer({
    title,
    artist:'Vídeo carregado ▶',
    ytId,
    level:'Livre',
    lyrics:buildFallbackLyrics(title)
  },'custom-'+ytId);
  showToast(`⚠️ ${lyricsResult.reason}. Tente buscar pelo nome da música.`,'info');
}
function searchSong(){
  const input=$('songSearchInput');
  const q=input.value.trim();
  if(!q){showToast('Digite o nome da música!','error');return;}
  if(q.includes('youtube.com') || q.includes('youtu.be')){
    $('ytLinkInput').value=q;
    input.value='';
    loadFromYouTube();
    return;
  }
  const found=findSongByQuery(q);
  if(found){
    openMusicPlayer(found[1],found[0]);
    input.value='';
  }else{
    showToast(`Não encontrei. Tente: ${getAvailableSongsText()}`,'info');
  }
}
function openMusicPlayer(song,key){
  currentSong={song,key};
  setVisible('music-search-panel', false);
  setVisible('music-favs-panel', false);
  setVisible('music-player', true);
  $('playerTitle').textContent=song.title;
  $('playerArtist').textContent=song.artist+(song.level?' • '+song.level:'');
  updateFavBtn();
  renderVideoPlayer(song);
  lyricMode='en';
  ['en','pt','both'].forEach(m=>$('tog-'+m).classList.toggle('active',m==='en'));
  renderLyrics(song.lyrics);
  if(!state.achievements.includes('music')){state.achievements.push('music');saveState();showToast('🏅 Conquista: Amante de músicas!','info');}
}
function closeMusicPlayer(){
  setVisible('music-player', false);
  setVisible('music-search-panel', true);
  $('mtab-search').classList.add('active');
  $('mtab-favs').classList.remove('active');
  setVisible('music-favs-panel', false);
  $('videoWrap').innerHTML='<div class="video-placeholder"><div class="vp-icon">🎵</div><p class="video-status">Carregando...</p></div>';
  currentSong=null;
}
// Atualiza traduções das letras gradualmente
async function updateLyricsTranslations(lyrics) {
  if (!currentSong || !currentSong.song.lyrics) return;
  
  for (let i = 0; i < lyrics.length; i++) {
    const line = lyrics[i];
    const lineEl = document.getElementById('lyric-' + i);
    if (lineEl && line.pt) {
      const ptEl = lineEl.querySelector('.lyric-pt');
      if (ptEl) {
        ptEl.textContent = line.pt;
      }
    }
  }
}

function renderLyrics(lyrics){
  const body=document.getElementById('lyricsBody');body.innerHTML='';
  lyrics.forEach((line,i)=>{
    const div=document.createElement('div');div.className='lyric-line';div.id='lyric-'+i;
    // Se pt está vazio, mostra placeholder de carregamento
    const ptText = line.pt || (line.pt === '' ? '⏳ Traduzindo...' : '');
    div.innerHTML=`<div class="lyric-en">${line.en}</div><div class="lyric-pt ${lyricMode!=='en'?'show':''}">${ptText}</div><div class="lyric-explain">${line.explain||''}</div>`;
    div.onclick=()=>toggleLyricDetail(i);body.appendChild(div);
  });
}
function toggleLyricDetail(i){
  const line=document.getElementById('lyric-'+i);
  const isActive=line.classList.contains('active-line');
  document.querySelectorAll('.lyric-line').forEach(l=>{l.classList.remove('active-line');if(lyricMode==='en')l.querySelector('.lyric-pt').classList.remove('show');l.querySelector('.lyric-explain').classList.remove('show');});
  if(!isActive){line.classList.add('active-line');line.querySelector('.lyric-pt').classList.add('show');line.querySelector('.lyric-explain').classList.add('show');}
}
function setLyricMode(mode){
  lyricMode=mode;
  ['en','pt','both'].forEach(m=>$('tog-'+m).classList.toggle('active',m===mode));
  $$('.lyric-pt').forEach(el=>el.classList.toggle('show',mode!=='en'));
}
function toggleFavorite(){
  if(!currentSong)return;const{key,song}=currentSong;
  const idx=state.favorites.findIndex(f=>f.key===key);
  if(idx>=0){state.favorites.splice(idx,1);showToast('Removida dos favoritos','info');}
  else{state.favorites.push({key,title:song.title,artist:song.artist,ytId:song.ytId,level:song.level});showToast('❤️ Salva nos favoritos!','success');}
  updateFavBtn();saveState();
}
function updateFavBtn(){
  if(!currentSong)return;
  const isFav=state.favorites.some(f=>f.key===currentSong.key);
  const btn=$('favBtn');
  btn.textContent=isFav?'❤️ Salva':'❤️ Salvar';
  btn.classList.toggle('faved',isFav);
}
function renderFavorites(){
  const list=$('favsList'),empty=$('favsEmpty');
  list.innerHTML='';
  if(!state.favorites.length){setVisible('favsEmpty', true);return;}
  setVisible('favsEmpty', false);
  state.favorites.forEach((fav,i)=>{
    const div=document.createElement('div');div.className='sugg-card';
    div.dataset.favoriteKey=fav.key;
    div.innerHTML=`<div class="sugg-thumb">${FAVORITE_ICONS[i%FAVORITE_ICONS.length]}</div><div class="sugg-meta"><div class="sugg-title">${fav.title}</div><div class="sugg-artist">${fav.artist}${fav.level?' • '+fav.level:''}</div></div><button class="fav-remove" type="button" data-action="remove-favorite" data-favorite-key="${fav.key}">✕</button>`;
    div.addEventListener('click',(event)=>{
      if(event.target.closest('[data-action="remove-favorite"]')) return;
      const song=SONGS[fav.key];
      if(song){
        openMusicPlayer(song,fav.key);
        switchMusicTab('search');
      }
    });
    list.appendChild(div);
  });
}
function removeFav(key){
  state.favorites=state.favorites.filter(f=>f.key!==key);
  saveState();
  renderFavorites();
  showToast('Removida dos favoritos','info');
}

// QUIZ DE MÚSICA
function startMusicQuiz(){
  if(!currentSong)return;
  const lyrics=currentSong.song.lyrics;quizQs=[];
  lyrics.forEach((line,i)=>{
    const words=line.en.split(' ');
    if(words.length>=3){
      const bi=Math.floor(Math.random()*(words.length-1))+1;
      const ans=words[bi].replace(/[^a-zA-Z']/g,'');
      if(ans.length>=2){
        const blank=[...words];blank[bi]='_____';
        quizQs.push({q:`Complete a letra:\n"${blank.join(' ')}"`,correct:ans,choices:genWrongChoices(ans)});
      }
    }
    if(i%2===0){
      quizQs.push({q:`Traduza para português:\n"${line.en.substring(0,55)}${line.en.length>55?'...':''}"`,correct:line.pt,choices:genTransChoices(line.pt,lyrics,i)});
    }
  });
  quizQs=quizQs.sort(()=>Math.random()-.5).slice(0,5);
  quizCurrent=0;quizCorrect=0;
  setVisible('quizOverlay', true);renderQuizQ();
}
function genWrongChoices(correct){const w=['love','night','heart','time','world','eyes','feel','know','life','way','stay','call'];const c=[correct];while(c.length<4){const x=w[Math.floor(Math.random()*w.length)];if(!c.includes(x))c.push(x);}return c.sort(()=>Math.random()-.5);}
function genTransChoices(correct,lyrics,skip){const others=lyrics.filter((_,i)=>i!==skip).map(l=>l.pt);const c=[correct];others.sort(()=>Math.random()-.5).slice(0,3).forEach(o=>{if(!c.includes(o))c.push(o);});while(c.length<4)c.push('Outra opção '+c.length);return c.sort(()=>Math.random()-.5);}
function renderQuizQ(){
  if(quizCurrent>=quizQs.length){closeQuizResult();return;}
  const q=quizQs[quizCurrent];
  const pct=(quizCurrent/quizQs.length)*100;
  setWidth('quizBar', pct+'%');
  $('quizCount').textContent=`${quizCurrent+1}/${quizQs.length}`;
  $('quizQ').textContent=q.q;
  setVisible('quizFeedback', false);
  setVisible('quizNextBtn', false);
  quizAnswered=false;
  const choices=$('quizChoices');choices.innerHTML='';
  q.choices.forEach(ch=>{const btn=document.createElement('button');btn.className='quiz-choice';btn.textContent=ch;btn.onclick=()=>{if(!quizAnswered)selectQuizA(ch,q);};choices.appendChild(btn);});
}
function selectQuizA(answer,q){
  quizAnswered=true;
  const isCorrect=answer.toLowerCase().trim()===q.correct.toLowerCase().trim();
  if(isCorrect)quizCorrect++;
  document.querySelectorAll('.quiz-choice').forEach(btn=>{btn.style.pointerEvents='none';if(btn.textContent.toLowerCase().trim()===q.correct.toLowerCase().trim())btn.classList.add('correct');else if(btn.textContent===answer&&!isCorrect)btn.classList.add('wrong');});
  const fb=$('quizFeedback');setVisible('quizFeedback', true);
  if(isCorrect){fb.style.background='rgba(0,255,136,.1)';fb.style.color='var(--green)';fb.textContent=['🎉 Incrível!','✨ Certo!','🔥 Mandou!','💪 Isso!'][Math.floor(Math.random()*4)];floatXP('+10 XP');state.xp+=10;}
  else{fb.style.background='rgba(255,45,120,.1)';fb.style.color='var(--pink)';fb.textContent=`❌ Correto: "${q.correct}"`;}
  setVisible('quizNextBtn', true);
}
function nextQuizQ(){quizCurrent++;renderQuizQ();}
function closeQuizResult(){
  const xpGained=quizCorrect*10;state.xp+=xpGained;updateUI();saveState();
  setVisible('quizOverlay', false);
  showToast(`🎵 Quiz: ${quizCorrect}/${quizQs.length} corretas! +${xpGained} XP`,'success');
}
function closeQuiz(){setVisible('quizOverlay', false);}

// ==================== MOTOR DE LIÇÕES ====================
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
  ],
  slang:[
    {type:'choice',qtype:'😎 Gíria',text:"O que significa \"That's lit!\"?",hint:'Expressão de aprovação',choices:['Isso é incrível!','Isso é uma luz!','Isso é ruim!','Isso é cansativo!'],correct:0},
    {type:'choice',qtype:'😎 Gíria',text:'"No cap" significa...',hint:'Quando alguém diz a verdade',choices:['Sem mentira / Sério!','Sem chapéu','Não pode!','Nunca!'],correct:0},
    {type:'choice',qtype:'😎 Gíria',text:"\"You're lowkey amazing\" significa...",hint:'"Lowkey" = quietamente...',choices:['Você é secretamente incrível','Você é barulhento','Você está baixo','Não sei'],correct:0},
    {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "That guy is so cool"',hint:'Esse cara é muito maneiro',words:['That','guy','is','so','cool','dude','nice'],answer:'That guy is so cool'},
    {type:'choice',qtype:'😎 Gíria',text:'"GOAT" significa...',hint:'Acrônimo famoso no esporte',choices:['Greatest Of All Time','Um bode','Grande atleta','Troféu'],correct:0},
    {type:'choice',qtype:'😎 Gíria',text:'"Vibe check" significa...',hint:'Verificar o clima de algo',choices:['Avaliar o clima/energia','Checar a música','Conferir vibração física','Testar o som'],correct:0},
  ],
  travel:[
    {type:'choice',qtype:'✈️ Viagem',text:'Como perguntar onde está o banheiro?',hint:'',choices:['Where is the restroom?','Where is the restaurant?','What time is the flight?','How much is the ticket?'],correct:0},
    {type:'choice',qtype:'✈️ Viagem',text:'"Can I have the check, please?" no restaurante significa...',hint:'"Check" tem outro significado aqui',choices:['A conta, por favor','Uma comida','Uma vistoria','Um cheque'],correct:0},
    {type:'wordorder',qtype:'🔤 Monte',text:'Peça um quarto para duas pessoas',hint:'"I would like a room for two"',words:['I','would','like','a','room','for','two','three'],answer:'I would like a room for two'},
    {type:'choice',qtype:'✈️ Viagem',text:'O que é "Round trip ticket"?',hint:'',choices:['Passagem de ida e volta','Só de ida','Circular','Barata'],correct:0},
    {type:'typing',qtype:'✍️ Viagem',text:'Como se diz "aeroporto" em inglês?',hint:'7 letras',answer:'airport',acceptAll:['airport']},
  ],
  daily:[
    {type:'choice',qtype:'⚡ Desafio',text:'"I\'m under the weather" significa...',hint:'Expressão idiomática',choices:['Estou me sentindo mal','Estou na chuva','Estou viajando','Estou feliz'],correct:0},
    {type:'wordorder',qtype:'🔤 Monte',text:'Diga que está com fome',hint:'"I am very hungry"',words:['I','am','very','hungry','thirsty','tired'],answer:'I am very hungry'},
    {type:'choice',qtype:'⚡ Desafio',text:'"It\'s raining cats and dogs" significa...',hint:'',choices:['Está chovendo muito forte','Chovendo animais','Granizando','Tempo estranho'],correct:0},
    {type:'typing',qtype:'✍️ Complete',text:'Trabalho remoto = "I work from ___"',hint:'4 letras',answer:'home',acceptAll:['home']},
    {type:'choice',qtype:'⚡ Desafio',text:'"Break a leg!" é usado para...',hint:'',choices:['Desejar boa sorte!','Cuidado!','Correr!','Uma ameaça'],correct:0},
    {type:'wordorder',qtype:'🔤 Monte',text:'Monte: "Have a nice day!"',hint:'Tenha um bom dia!',words:['Have','a','nice','day','good','great'],answer:'Have a nice day'},
  ],
  flashcard:[
    {type:'choice',qtype:'🃏 Flashcard',text:'AFRAID significa...',hint:'',choices:['Com medo','Confuso','Feliz','Surpreso'],correct:0},
    {type:'choice',qtype:'🃏 Flashcard',text:'GORGEOUS significa...',hint:'',choices:['Lindo/Deslumbrante','Assustador','Confuso','Pequeno'],correct:0},
    {type:'choice',qtype:'🃏 Flashcard',text:'OVERWHELMED significa...',hint:'',choices:['Sobrecarregado','Animado','Entediado','Relaxado'],correct:0},
    {type:'choice',qtype:'🃏 Flashcard',text:'STUBBORN significa...',hint:'',choices:['Teimoso','Gentil','Corajoso','Estranho'],correct:0},
    {type:'choice',qtype:'🃏 Flashcard',text:'AWKWARD significa...',hint:'',choices:['Constrangedor/Desajeitado','Animado','Elegante','Furioso'],correct:0},
    {type:'choice',qtype:'🃏 Flashcard',text:'CRAVE significa...',hint:'',choices:['Ter desejo intenso','Ter medo','Ter pressa','Ter dinheiro'],correct:0},
  ],
  speed:[
    {type:'choice',qtype:'⚡ SPEED',text:'CAT = ?',hint:'',choices:['Gato','Cachorro','Pássaro','Peixe'],correct:0},
    {type:'choice',qtype:'⚡ SPEED',text:'HOUSE = ?',hint:'',choices:['Casa','Rua','Escola','Carro'],correct:0},
    {type:'choice',qtype:'⚡ SPEED',text:'HAPPY = ?',hint:'',choices:['Feliz','Triste','Bravo','Cansado'],correct:0},
    {type:'choice',qtype:'⚡ SPEED',text:'FRIEND = ?',hint:'',choices:['Amigo','Inimigo','Família','Vizinho'],correct:0},
    {type:'choice',qtype:'⚡ SPEED',text:'BOOK = ?',hint:'',choices:['Livro','Caderno','Caneta','Mesa'],correct:0},
    {type:'choice',qtype:'⚡ SPEED',text:'FOOD = ?',hint:'',choices:['Comida','Bebida','Roupa','Dinheiro'],correct:0},
  ],
  boss:[
    {type:'choice',qtype:'👹 BOSS',text:'"The ball is in your court" significa...',hint:'',choices:['A decisão é sua agora','A bola está no campo','Você perdeu','Continue jogando'],correct:0},
    {type:'wordorder',qtype:'🔤 BOSS',text:"Monte: \"I couldn't agree more\"",hint:'Concordo completamente',words:["I","couldn't","agree","more","less","better"],answer:"I couldn't agree more"},
    {type:'typing',qtype:'✍️ BOSS',text:'Como se diz "À vontade" em inglês? (__ ahead)',hint:'',answer:'go ahead',acceptAll:['go ahead','go for it','feel free']},
    {type:'choice',qtype:'👹 BOSS',text:'"Bite the bullet" significa...',hint:'Expressão idiomática avançada',choices:['Aguentar firme em algo difícil','Comer uma bala','Correr rápido','Desistir de tudo'],correct:0},
    {type:'choice',qtype:'👹 BOSS',text:'Qual é o gerúndio correto de "swim"?',hint:'',choices:['swimming','swiming','swimmed','swammed'],correct:0},
  ],
};

let currentLesson=[],currentQ=0,lessonCorrect=0,lessonLivesLeft=3,selectedChoice=-1,wordOrderAnswer=[],currentLessonType='basics',lessonStartTime=0;
let isAnswered=false;

function startLesson(type){
  currentLessonType=type;
  const pool=QUESTIONS_DB[type]||QUESTIONS_DB.basics;
  currentLesson=[...pool].sort(()=>Math.random()-.5).slice(0,Math.min(pool.length,6));
  currentQ=0;lessonCorrect=0;lessonLivesLeft=3;lessonStartTime=Date.now();isAnswered=false;
  showScreen('lesson');renderQuestion();updateLessonLives();
}

function renderQuestion(){
  const q=currentLesson[currentQ];
  isAnswered=false;
  setWidth('lessonBar', (currentQ/currentLesson.length)*100+'%');
  $('qType').textContent=q.qtype;
  $('qText').textContent=q.text;
  $('qHint').textContent=q.hint||'';
  setVisible('choicesArea', false);
  setVisible('wordOrderArea', false);
  setVisible('typingArea', false);
  // Reinicia o feedback
  const fb=$('feedbackOverlay');
  fb.className='feedback-overlay';fb.classList.remove('show');
  // Reinicia o botão de envio
  const submitBtn=$('submitBtn');
  submitBtn.disabled=true;submitBtn.textContent='Verificar ✓';
  selectedChoice=-1;wordOrderAnswer=[];

  if(q.type==='choice'){
    const area=$('choicesArea');setVisible('choicesArea', true);area.innerHTML='';
    const letters=['A','B','C','D'];
    q.choices.forEach((ch,i)=>{
      const btn=document.createElement('button');btn.className='choice-btn';
      btn.innerHTML=`<span class="choice-letter">${letters[i]}</span>${ch}`;
      btn.onclick=()=>selectChoice(i,btn);
      area.appendChild(btn);
    });
  } else if(q.type==='wordorder'){
    setVisible('wordOrderArea', true);
    const ansArea=$('answerArea');
    ansArea.innerHTML='<span class="answer-placeholder" id="answerPlaceholder">Toque nas palavras para montar a frase</span>';
    ansArea.classList.remove('has-words');
    const bank=$('wordBank');bank.innerHTML='';
    const shuffled=[...q.words].sort(()=>Math.random()-.5);
    shuffled.forEach(w=>{
      const chip=document.createElement('div');chip.className='word-chip';chip.textContent=w;
      chip.onclick=()=>addWordToAnswer(w,chip);
      bank.appendChild(chip);
    });
  } else if(q.type==='typing'){
    setVisible('typingArea', true);
    const inp=$('typeInput');inp.value='';inp.focus();
    inp.oninput=()=>submitBtn.disabled=inp.value.trim().length===0;
    inp.onkeydown=(e)=>{if(e.key==='Enter'&&!submitBtn.disabled&&!isAnswered)submitAnswer();};
  }
}

function selectChoice(idx,btn){
  if(isAnswered)return;
  selectedChoice=idx;
  $$('.choice-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  $('submitBtn').disabled=false;
}

function addWordToAnswer(word,chip){
  if(isAnswered||chip.classList.contains('used'))return;
  chip.classList.add('used');
  wordOrderAnswer.push({word,chip});
  const ansArea=$('answerArea');
  const placeholder=$('answerPlaceholder');
  if(placeholder)placeholder.remove();
  ansArea.classList.add('has-words');
  const wordEl=document.createElement('div');wordEl.className='answer-word';wordEl.textContent=word;
  wordEl.addEventListener('click',()=>removeWordFromAnswer(wordEl,chip));
  ansArea.appendChild(wordEl);
  $('submitBtn').disabled=wordOrderAnswer.length===0;
}

function removeWordFromAnswer(wordEl,chip){
  if(isAnswered)return;
  wordEl.remove();
  chip.classList.remove('used');
  wordOrderAnswer=wordOrderAnswer.filter(w=>w.chip!==chip);
  const ansArea=$('answerArea');
  if(wordOrderAnswer.length===0){
    ansArea.innerHTML='<span class="answer-placeholder" id="answerPlaceholder">Toque nas palavras para montar a frase</span>';
    ansArea.classList.remove('has-words');
    $('submitBtn').disabled=true;
  }
}

function submitAnswer(){
  if(isAnswered)return;
  isAnswered=true;
  const q=currentLesson[currentQ];
  let isCorrect=false;
  $('submitBtn').disabled=true;

  if(q.type==='choice'){
    isCorrect=selectedChoice===q.correct;
    $$('.choice-btn').forEach((btn,i)=>{
      btn.style.pointerEvents='none';
      if(i===q.correct)btn.classList.add('correct');
      else if(i===selectedChoice&&!isCorrect)btn.classList.add('wrong');
    });
  } else if(q.type==='wordorder'){
    const userAnswer=wordOrderAnswer.map(w=>w.word).join(' ');
    isCorrect=userAnswer.toLowerCase().trim()===q.answer.toLowerCase().trim();
    $$('.answer-word').forEach(w=>w.style.borderColor=isCorrect?'var(--green)':'var(--pink)');
    if(!isCorrect){
      const ansArea=$('answerArea');
      const hint=document.createElement('div');hint.className='answer-hint';hint.textContent='✓ '+q.answer;ansArea.appendChild(hint);
    }
  } else if(q.type==='typing'){
    const inp=$('typeInput');
    const userVal=inp.value.trim().toLowerCase();
    isCorrect=(q.acceptAll||[q.answer]).some(a=>userVal===a.toLowerCase());
    inp.style.borderColor=isCorrect?'var(--green)':'var(--pink)';
    if(!isCorrect){inp.value=q.answer;inp.style.color='var(--muted)';}
  }

  if(isCorrect){
    lessonCorrect++;floatXP('+10 XP');
  } else {
    lessonLivesLeft=Math.max(0,lessonLivesLeft-1);
    updateLessonLives();
    if(lessonLivesLeft===0)setTimeout(()=>showFeedback(false,q,true),800);
  }
  showFeedback(isCorrect,q,false);
}

function showFeedback(correct,q,gameOver){
  const fb=$('feedbackOverlay');
  fb.className='feedback-overlay '+(correct?'correct-fb':'wrong-fb');
  $('fbIcon').textContent=correct?['🎉','⭐','🔥','✨'][Math.floor(Math.random()*4)]:'💔';
  const title=$('fbTitle');
  title.className='fb-title '+(correct?'c':'w');
  title.textContent=correct?['Incrível!','Mandou bem!','Correto!','Perfeito!'][Math.floor(Math.random()*4)]:(gameOver?'Sem vidas!':'Errou!');
  const msg=$('fbMsg');
  if(correct){msg.textContent=['Continue assim!','Você está indo muito bem!','Bora para a próxima!','Excelente resposta!'][Math.floor(Math.random()*4)];}
  else if(gameOver){msg.textContent='Você ficou sem vidas. Vamos ver seu resultado!';}
  else if(q.type==='choice'){msg.textContent='A resposta correta era: '+q.choices[q.correct];}
  else if(q.type==='wordorder'){msg.textContent='Ordem correta: '+q.answer;}
  else{msg.textContent='Resposta correta: '+q.answer;}
  const contBtn=$('continueBtn');
  contBtn.className='btn-continue '+(correct?'c':'w');
  contBtn.textContent=gameOver?'Ver resultado →':'Continuar →';
  setTimeout(()=>fb.classList.add('show'),50);
}

function nextQuestion(){
  const fb=$('feedbackOverlay');fb.classList.remove('show');
  if(lessonLivesLeft===0){setTimeout(finishLesson,400);return;}
  currentQ++;
  if(currentQ>=currentLesson.length){setTimeout(finishLesson,400);}
  else{setTimeout(()=>{renderQuestion();},400);}
}

function updateLessonLives(){
  const lives=$('lessonLives');
  lives.textContent='❤️'.repeat(lessonLivesLeft)+'🖤'.repeat(Math.max(0,3-lessonLivesLeft));
}

function finishLesson(){
  const elapsed=Math.round((Date.now()-lessonStartTime)/1000);
  const total=currentLesson.length;
  const acc=Math.round((lessonCorrect/total)*100);
  const xpGained=lessonCorrect*10+(acc===100?25:0)+(lessonLivesLeft===3?15:0);
  state.xp+=xpGained;state.totalCorrect+=lessonCorrect;state.totalLessons++;
  // Sequência diária
  const today=new Date().toDateString();
  if(state.lastPlayed!==today){
    const yesterday=new Date(Date.now()-86400000).toDateString();
    if(state.lastPlayed===yesterday)state.streak++;
    else if(state.lastPlayed!==today)state.streak=1;
    state.lastPlayed=today;
  }
  // Conquistas
  if(!state.achievements.includes('first')){state.achievements.push('first');}
  if(state.streak>=3&&!state.achievements.includes('streak3'))state.achievements.push('streak3');
  if(state.xp>=100&&!state.achievements.includes('xp100'))state.achievements.push('xp100');
  if(state.xp>=500&&!state.achievements.includes('xp500'))state.achievements.push('xp500');
  if(acc===100&&!state.achievements.includes('perfect'))state.achievements.push('perfect');
  if(state.totalLessons>=5&&!state.achievements.includes('lessons5'))state.achievements.push('lessons5');
  // Subida de nível
  checkLevelUp();
  updateUI();saveState();
  // Tela de resultado
  const emojis=acc===100?['🏆','🌟','💎']:acc>=70?['🔥','⭐','😎']:['💪','🌱','😅'];
  $('resultEmoji').textContent=emojis[Math.floor(Math.random()*3)];
  $('resultTitle').textContent=acc===100?'Perfeito!':acc>=70?'Muito bom!':'Continue praticando!';
  $('resultSub').textContent=`${lessonCorrect}/${total} corretas`;
  $('resXp').textContent='+'+xpGained;
  $('resAcc').textContent=acc+'%';
  $('resTime').textContent=elapsed+'s';
  showScreen('result');
  if(acc===100)launchConfetti();
  showXpPopup('+'+xpGained+' XP');
}

function checkLevelUp(){
  const lvlData=LEVELS_APP[state.level-1];
  if(lvlData&&state.xp>=lvlData.xpNeeded&&state.level<LEVELS_APP.length){
    state.level++;showToast('🎉 Subiu para nível '+state.level+'!','success');}
}

function exitLesson(){showScreen('app');updateUI();}
function returnHome(){showScreen('app');updateUI();}
function playAgain(){startLesson(currentLessonType);}

// ==================== ATUALIZAÇÕES DE INTERFACE ====================
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0,0);
}

function switchTab(tab){
  ['home','music','ranking','profile'].forEach(t=>{
    $(t+'-tab'+(t==='profile'?'-content':'')).classList.toggle('active',t===tab);
    $('nav-'+t).classList.toggle('active',t===tab);
  });
  if(tab==='ranking')renderRanking();
  if(tab==='profile')renderProfile();
}

function updateUI(){
  $('streakCount').textContent=state.streak;
  $('xpCount').textContent=state.xp;
  $('livesCount').textContent=state.lives;
  $('bannerStreak').textContent=state.streak;
  const lvlData=LEVELS_APP[Math.min(state.level-1,LEVELS_APP.length-1)];
  const prevXp=state.level>1?LEVELS_APP[state.level-2].xpNeeded:0;
  const needed=lvlData.xpNeeded;
  const pct=Math.min(100,Math.round(((state.xp-prevXp)/(needed-prevXp))*100));
  $('levelLabel').textContent='Nível '+state.level+' — '+lvlData.name;
  $('xpLabel').textContent=state.xp+'/'+needed+' XP';
  setWidth('xpFill', pct+'%');
  // Mensagem da sequência
  const msgs=[['Comece sua ofensiva!','Estude hoje para não perder.'],['1 dia! Continue amanhã!','Não quebre agora!'],['2 dias! Quase lá!','Falta pouco para 3!'],['🔥 Trio completo!','Você está pegando fogo!'],['Incrível! '+state.streak+' dias!','Você é imparável!']];
  const mi=Math.min(state.streak,msgs.length-1);
  $('streakMsg').textContent=msgs[mi][0];
  $('streakSub').textContent=msgs[mi][1];
  // Indicadores visuais da sequência
  const dots=$('streakDays');dots.innerHTML='';
  for(let i=0;i<7;i++){const d=document.createElement('div');d.className='day-dot'+(i<state.streak?' done':'');dots.appendChild(d);}
}

function renderRanking(){
  const list=$('rankingList');list.innerHTML='';
  const all=[...RANKING_PLAYERS,{name:state.name||'Você',xp:state.xp,avatar:'🧑‍🚀',isYou:true}];
  all.sort((a,b)=>b.xp-a.xp);
  const medals=['🥇','🥈','🥉'];
  all.forEach((p,i)=>{
    const div=document.createElement('div');div.className='ranking-item';
    if(p.isYou)div.style.borderColor='rgba(255,77,0,.4)';
    div.innerHTML=`<div class="rank-pos">${medals[i]||i+1}</div><div class="rank-avatar">${p.avatar}</div><div class="rank-name">${p.name}${p.isYou?' <span class="you-badge">VOCÊ</span>':''}</div><div class="rank-xp">⚡ ${p.xp} XP</div>`;
    list.appendChild(div);
  });
}

function renderProfile(){
  $('profileName').textContent=state.name||'Estudante';
  $('profileLevel').textContent='Nível '+state.level+' — '+(LEVELS_APP[Math.min(state.level-1,LEVELS_APP.length-1)].name);
  $('profileEnLevel').textContent=state.englishLevel?'Inglês: '+state.englishLevel+' — '+(LEVEL_RESULTS[state.englishLevel]?.name||''):'';
  $('totalXpStat').textContent=state.xp;
  $('streakStat').textContent=state.streak;
  $('correctStat').textContent=state.totalCorrect;
  $('lessonsStat').textContent=state.totalLessons;
  // Conquistas
  const achList=$('achievementsList');achList.innerHTML='';
  ACHIEVEMENTS_DEF.forEach(a=>{
    const div=document.createElement('div');div.className='ach-item'+(state.achievements.includes(a.id)?'':' locked');
    div.innerHTML=`<span class="ach-icon">${a.icon}</span><span class="ach-name">${a.name}</span>`;
    achList.appendChild(div);
  });
}

// ==================== UTILITÁRIOS ====================
function saveState(){try{localStorage.setItem('linguafire_v2',JSON.stringify(state));}catch(e){}}
function loadState(){try{const d=localStorage.getItem('linguafire_v2');if(d){const s=JSON.parse(d);Object.assign(state,s);}}catch(e){}}

function exportProgress(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='linguafire_backup.json';a.click();
  showToast('📥 Progresso exportado!','success');
}
function importProgress(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{try{const d=JSON.parse(ev.target.result);Object.assign(state,d);saveState();updateUI();renderProfile();showToast('📤 Progresso importado!','success');}catch(err){showToast('Arquivo inválido!','error');}};
  reader.readAsText(file);
}

let toastTimer=null;
function showToast(msg,type='info'){
  const t=$('toast');
  t.textContent=msg;t.className='toast '+type+' show';
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

function showXpPopup(val){
  const p=$('xpPopup');
  $('xpPopupVal').textContent=val;
  p.classList.add('show');setTimeout(()=>p.classList.remove('show'),2000);
}

function floatXP(text){
  const el=document.createElement('div');el.className='float-xp';el.textContent=text;
  el.style.left=Math.random()*60+20+'%';el.style.top='40%';
  document.body.appendChild(el);setTimeout(()=>el.remove(),1600);
}

function launchConfetti(){
  const colors=['#ff4d00','#ff8c00','#ffcc00','#00ff88','#00d4ff','#ff2d78','#7c3aed'];
  for(let i=0;i<60;i++){
    const c=document.createElement('div');c.className='confetti-piece';
    c.style.setProperty('--dur',(Math.random()*2+1.5)+'s');
    c.style.left=Math.random()*100+'vw';c.style.top='-10px';
    c.style.background=colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDelay=Math.random()*1+'s';
    document.body.appendChild(c);setTimeout(()=>c.remove(),4000);
  }
}

// ==================== INICIALIZAÇÃO ====================

// Navegação para telas de auth
function showLoginScreen() {
  showScreen('login');
  $('loginError').classList.add('is-hidden');
}

function showRegisterScreen() {
  showScreen('register');
  $('registerError').classList.add('is-hidden');
}

// Event handlers de autenticação
async function handleLogin() {
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const errorEl = $('loginError');
  
  if (!email || !password) {
    errorEl.textContent = 'Preencha email e senha';
    errorEl.classList.remove('is-hidden');
    return;
  }
  
  try {
    const user = await login(email, password);
    state.name = user.name;
    state.level = user.level || 1;
    state.xp = user.xp || 0;
    state.streak = user.streak || 0;
    state.totalCorrect = user.correct_answers || 0;
    state.totalLessons = user.lessons_completed || 0;
    state.englishLevel = user.english_level || '';
    state.achievements = user.achievements || [];
    state.favorites = user.favorites || [];
    saveState();
    
    showToast('Login realizado!', 'success');
    goToPlacement();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('is-hidden');
  }
}

async function handleRegister() {
  const name = $('registerName').value.trim();
  const email = $('registerEmail').value.trim();
  const password = $('registerPassword').value;
  const confirm = $('registerConfirm').value;
  const errorEl = $('registerError');
  
  if (!name || !email || !password) {
    errorEl.textContent = 'Preencha todos os campos';
    errorEl.classList.remove('is-hidden');
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres';
    errorEl.classList.remove('is-hidden');
    return;
  }
  
  if (password !== confirm) {
    errorEl.textContent = 'As senhas não coincidem';
    errorEl.classList.remove('is-hidden');
    return;
  }
  
  try {
    const user = await register(name, email, password);
    state.name = user.name;
    state.level = 1;
    state.xp = 0;
    state.streak = 0;
    state.totalCorrect = 0;
    state.totalLessons = 0;
    state.englishLevel = '';
    state.achievements = [];
    state.favorites = [];
    saveState();
    
    showToast('Conta criada!', 'success');
    goToPlacement();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.remove('is-hidden');
  }
}

function bindAuthEvents() {
  // Login screen
  $('loginBtn').addEventListener('click', handleLogin);
  $('googleLoginBtn').addEventListener('click', () => loginWithGoogle());
  $('showRegisterBtn').addEventListener('click', showRegisterScreen);
  $('backToSplashBtn').addEventListener('click', () => showScreen('splash'));
  
  // Register screen
  $('registerBtn').addEventListener('click', handleRegister);
  $('googleRegisterBtn').addEventListener('click', () => loginWithGoogle());
  $('showLoginBtn').addEventListener('click', showLoginScreen);
  $('backToSplashFromRegisterBtn').addEventListener('click', () => showScreen('splash'));
}

function bindStaticEvents(){
  bindAuthEvents();
  
  $('startBtn').addEventListener('click', () => {
    if (isLoggedIn()) {
      // Já logado, vai direto pro app
      loadStateFromServer().then(() => {
        showScreen('app');
        updateUI();
      });
    } else {
      showLoginScreen();
    }
  });
  $('nameInput').addEventListener('keydown',(event)=>{if(event.key==='Enter')goToPlacement();});
  $('enterAppBtn').addEventListener('click', enterApp);
  $('loadYoutubeBtn').addEventListener('click', loadFromYouTube);
  $('searchSongBtn').addEventListener('click', searchSong);
  $('songSearchInput').addEventListener('keydown',(event)=>{if(event.key==='Enter')searchSong();});
  $('favBtn').addEventListener('click', toggleFavorite);
  $('musicQuizBtn').addEventListener('click', startMusicQuiz);
  $('closeMusicPlayerBtn').addEventListener('click', closeMusicPlayer);
  $('exportProgressBtn').addEventListener('click', exportProgress);
  $('importProgressInput').addEventListener('change', importProgress);
  $('exitLessonBtn').addEventListener('click', exitLesson);
  $('submitBtn').addEventListener('click', submitAnswer);
  $('continueBtn').addEventListener('click', nextQuestion);
  $('returnHomeBtn').addEventListener('click', returnHome);
  $('playAgainBtn').addEventListener('click', playAgain);
  $('closeQuizBtn').addEventListener('click', closeQuiz);
  $('quizNextBtn').addEventListener('click', nextQuizQ);

  $$('[data-action="start-lesson"]').forEach(element=>{
    element.addEventListener('click',()=>startLesson(element.dataset.lesson));
  });

  $$('[data-action="switch-tab"]').forEach(element=>{
    element.addEventListener('click',()=>switchTab(element.dataset.tab));
  });

  $$('[data-action="switch-music-tab"]').forEach(element=>{
    element.addEventListener('click',()=>switchMusicTab(element.dataset.musicTab));
  });

  $$('[data-action="load-suggestion"]').forEach(element=>{
    element.addEventListener('click',()=>loadSuggestion(element.dataset.songKey));
  });

  $$('[data-action="set-lyric-mode"]').forEach(element=>{
    element.addEventListener('click',()=>setLyricMode(element.dataset.lyricMode));
  });

  document.addEventListener('click',(event)=>{
    const removeButton=event.target.closest('[data-action="remove-favorite"]');
    if(removeButton){
      event.stopPropagation();
      removeFav(removeButton.dataset.favoriteKey);
    }
  });
}

// Inicialização principal
async function initApp() {
  // Verificar callback do Google OAuth
  if (checkGoogleCallback()) {
    // Carregou do Google, vai pro placement
    const loaded = await loadStateFromServer();
    if (loaded && state.englishLevel) {
      showScreen('app');
      updateUI();
    } else {
      showScreen('placement');
    }
    return;
  }
  
  loadState();
  
  if (isLoggedIn()) {
    // Usuário logado: tenta carregar do servidor
    const loaded = await loadStateFromServer();
    if (loaded && state.name) {
      showScreen('app');
      updateUI();
    } else if (state.englishLevel) {
      showScreen('app');
      updateUI();
    } else {
      showScreen('placement');
    }
  } else if (state.name && state.englishLevel) {
    // Usuário offline recorrente
    showScreen('app');
    updateUI();
  } else {
    // Primeira vez
    showScreen('splash');
  }
}

bindStaticEvents();
initApp();
