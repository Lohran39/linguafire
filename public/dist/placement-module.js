// ==================== TESTE DE NIVELAMENTO ====================
(function initPlacementModule(window){
  'use strict';

  const LEVEL_COLORS={
    A1:'#00ff88',
    A2:'#00d4ff',
    B1:'#ffcc00',
    B2:'#ff8c00',
    C1:'#ff4d00'
  };

  const DEFAULT_QUESTION_BANK={
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

  function getLevelColor(level){
    return LEVEL_COLORS[level] || LEVEL_COLORS.A1;
  }

  function createController(options = {}){
    const {
      $,
      $$,
      createEl,
      setVisible,
      setWidth,
      state,
      questionBank = DEFAULT_QUESTION_BANK,
      levelResults,
      lessonTools,
      showToast,
      showLoginScreen,
      showScreen,
      saveState,
      updateUI
    } = options;

    const shuffleArray=lessonTools?.shuffleArray || ((items)=>[...(items || [])].sort(()=>Math.random()-.5));
    const getRandomPlacementQuestions=lessonTools?.getRandomPlacementQuestions || ((bank, count)=>shuffleArray(Object.values(bank || {}).flat()).slice(0,count));

    let questions=[];
    let current=0;
    let correct=0;
    let startTime=0;
    let answered=false;

    function buildQuestions(count=15){
      return getRandomPlacementQuestions(questionBank, count, getLevelColor);
    }

    function startPlacementTest(){
      const name=(state.name || '').trim();
      if(!name){
        showToast('Nome do usuario nao encontrado. Faca login novamente.','error');
        showLoginScreen();
        return;
      }

      state.name=name;
      questions=buildQuestions(15);
      current=0;
      correct=0;
      answered=false;
      startTime=Date.now();
      setVisible('pt-q-wrap', true);
      setVisible('pt-progress-wrap', true);
      setVisible('pt-result', false);
      showScreen('placement');
      renderQuestion();
    }

    function renderQuestion(){
      const question=questions[current];
      if(!question){
        showResult();
        return;
      }

      const pct=(current/questions.length)*100;
      setWidth('ptBar', pct+'%');
      $('ptCount').textContent=`${current} / ${questions.length}`;

      const badge=$('pt-badge');
      const color=getLevelColor(question.level);
      badge.textContent=`Nível ${question.level}`;
      badge.style.background=color+'22';
      badge.style.color=color;
      badge.style.border=`1px solid ${color}55`;

      $('pt-qtext').textContent=question.text;
      $('pt-hint').textContent=question.hint || '';

      const choices=$('pt-choices');
      choices.innerHTML='';
      answered=false;
      const letters=['A','B','C','D'];

      question.choices.forEach((choice,index)=>{
        const btn=document.createElement('button');
        btn.className='pt-choice';
        btn.append(createEl('span','pt-letter',letters[index]), document.createTextNode(String(choice)));
        btn.addEventListener('click',()=>{ if(!answered) selectAnswer(index, btn, question); });
        choices.appendChild(btn);
      });
    }

    function selectAnswer(index, btn, question){
      answered=true;
      $$('.pt-choice').forEach(choice=>{ choice.style.pointerEvents='none'; });

      if(index===question.correct){
        correct+=1;
        btn.classList.add('correct');
      }else{
        btn.classList.add('wrong');
        $$('.pt-choice')[question.correct]?.classList.add('correct');
      }

      setTimeout(()=>{
        current+=1;
        if(current>=questions.length) showResult();
        else renderQuestion();
      },900);
    }

    function showResult(){
      const elapsed=Math.round((Date.now()-startTime)/1000);
      const total=questions.length || 1;
      const score=Math.round((correct/total)*100);
      let level='A1';
      if(score>=90) level='C1';
      else if(score>=73) level='B2';
      else if(score>=53) level='B1';
      else if(score>=33) level='A2';

      state.englishLevel=level;
      saveState();

      setVisible('pt-q-wrap', false);
      setVisible('pt-progress-wrap', false);
      $('pt-title').textContent='🎉 Seu resultado!';
      $('pt-sub').textContent='Seu nível de inglês foi identificado:';

      const result=levelResults[level];
      $('res-emoji').textContent=result.emoji;
      $('res-level').textContent=result.name;
      $('res-level').style.color=result.color;
      $('res-desc').textContent=result.desc;
      $('res-correct').textContent=correct;
      $('res-score').textContent=score+'%';
      $('res-time').textContent=elapsed+'s';

      setVisible('pt-result', true);
      updateUI();
    }

    return {
      buildQuestions,
      getLevelColor,
      startPlacementTest,
      renderQuestion,
      selectAnswer,
      showResult
    };
  }

  window.LinguaFirePlacement={
    QUESTION_BANK:DEFAULT_QUESTION_BANK,
    createController,
    getLevelColor
  };
})(window);
