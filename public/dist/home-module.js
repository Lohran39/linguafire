(function initHomeModule(window){
  'use strict';

  const DEFAULT_RANKING_PLAYERS=Object.freeze([
    {name:'Marcos R.',xp:1820,avatar:'🦁'},
    {name:'Julia F.',xp:1560,avatar:'🦊'},
    {name:'Pedro H.',xp:1340,avatar:'🐺'},
    {name:'Ana C.',xp:980,avatar:'🦋'},
    {name:'Carlos M.',xp:720,avatar:'🐯'}
  ]);

  function fallbackCreateEl(tag,className='',text=''){
    const element=document.createElement(tag);
    if(className) element.className=className;
    if(text!==undefined && text!==null) element.textContent=String(text);
    return element;
  }

  function createController(options={}){
    const getEl=typeof options.$==='function' ? options.$ : (id)=>document.getElementById(id);
    const createEl=typeof options.createEl==='function' ? options.createEl : fallbackCreateEl;
    const state=options.state || {};
    const levels=Array.isArray(options.levels) ? options.levels : [];
    const rankingPlayers=Array.isArray(options.rankingPlayers) ? options.rankingPlayers : DEFAULT_RANKING_PLAYERS;
    const setWidth=typeof options.setWidth==='function' ? options.setWidth : function noop(){};
    const speakText=typeof options.speakText==='function' ? options.speakText : function noop(){};
    const isLoggedIn=typeof options.isLoggedIn==='function' ? options.isLoggedIn : async()=>false;
    const getAuthHeaders=typeof options.getAuthHeaders==='function' ? options.getAuthHeaders : ()=>({});
    const showToast=typeof options.showToast==='function' ? options.showToast : function noop(){};
    const loadStateFromServer=typeof options.loadStateFromServer==='function' ? options.loadStateFromServer : async()=>{};

    function setText(id,value){
      const element=getEl(id);
      if(element) element.textContent=String(value ?? '');
    }

    function getCurrentLevel(){
      if(!levels.length) return {name:'Iniciante',xpNeeded:200};
      const index=Math.min(Math.max(Number(state.level || 1)-1,0),levels.length-1);
      return levels[index] || levels[0];
    }

    async function loadWordOfTheDay(){
      const wordEl=getEl('wodWord');
      const transEl=getEl('wodTranslation');
      if(!wordEl) return;

      try{
        const res=await fetch('/api/daily/word');
        if(!res.ok){
          wordEl.textContent='Servidor offline';
          if(transEl) transEl.textContent='Verifique se o servidor esta rodando';
          return;
        }

        const word=await res.json();
        setText('wodWord',word.word);
        setText('wodTranslation',word.translation);
        setText('wodLevel',`📊 Nível ${word.level || '-'}`);
        setText('wodContext',word.context || '');

        const speakButton=getEl('wodSpeakBtn');
        if(speakButton) speakButton.onclick=()=>speakText(word.word);
      }catch(error){
        console.error('Word of day error:',error);
        wordEl.textContent='Erro de conexao';
        if(transEl) transEl.textContent='Verifique sua internet';
      }
    }

    async function checkStreakRewards(){
      if(!await isLoggedIn()) return;

      try{
        const res=await fetch('/api/streak/rewards',{
          headers:getAuthHeaders(),
          credentials:'include'
        });
        if(!res.ok) return;

        const data=await res.json();
        const claimable=Array.isArray(data.rewards)
          ? data.rewards.filter((reward)=>reward.canClaim)
          : [];

        for(const reward of claimable){
          await claimStreakReward(reward.id);
        }
      }catch(_error){}
    }

    async function claimStreakReward(rewardId){
      try{
        const res=await fetch('/api/streak/claim',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          credentials:'include',
          body:JSON.stringify({rewardId})
        });
        const data=await res.json();

        if(data.success){
          showToast(`🎉 ${data.message}`,'success');
          await loadStateFromServer();
        }
      }catch(_error){}
    }

    function updateUI(){
      setText('streakCount',state.streak || 0);
      setText('xpCount',state.xp || 0);
      setText('livesCount',state.lives || 0);
      setText('bannerStreak',state.streak || 0);

      const currentLevel=getCurrentLevel();
      const currentLevelIndex=Math.min(Math.max(Number(state.level || 1)-1,0),Math.max(levels.length-1,0));
      const prevXp=currentLevelIndex>0 ? Number(levels[currentLevelIndex-1]?.xpNeeded || 0) : 0;
      const needed=Number(currentLevel.xpNeeded || 200);
      const xp=Number(state.xp || 0);
      const pct=Math.min(100,Math.max(0,Math.round(((xp-prevXp)/Math.max(needed-prevXp,1))*100)));

      setText('levelLabel',`Nível ${state.level || 1} — ${currentLevel.name || 'Iniciante'}`);
      setText('xpLabel',`${xp}/${needed} XP`);
      setWidth('xpFill',`${pct}%`);

      const shopXpEl=getEl('shopXpBalance');
      if(shopXpEl) shopXpEl.textContent=String(xp);

      const messages=[
        ['Comece sua ofensiva!','Estude hoje para nao perder.'],
        ['1 dia! Continue amanha!','Nao quebre agora!'],
        ['2 dias! Quase la!','Falta pouco para 3!'],
        ['🔥 Trio completo!','Voce esta pegando fogo!'],
        [`Incrivel! ${state.streak || 0} dias!`,'Voce e imparavel!']
      ];
      const messageIndex=Math.min(Number(state.streak || 0),messages.length-1);
      setText('streakMsg',messages[messageIndex][0]);
      setText('streakSub',messages[messageIndex][1]);

      const dots=getEl('streakDays');
      if(dots){
        dots.replaceChildren();
        for(let index=0;index<7;index+=1){
          const dot=document.createElement('div');
          dot.className=`day-dot${index<Number(state.streak || 0) ? ' done' : ''}`;
          dots.appendChild(dot);
        }
      }

      const homeTab=getEl('home-tab');
      if(homeTab?.classList.contains('active')){
        loadWordOfTheDay();
      }
    }

    function renderRanking(){
      const list=getEl('rankingList');
      if(!list) return;

      const all=[
        ...rankingPlayers,
        {name:state.name || 'Voce',xp:Number(state.xp || 0),avatar:'🧑‍🚀',isYou:true}
      ].sort((a,b)=>Number(b.xp || 0)-Number(a.xp || 0));

      const medals=['🥇','🥈','🥉'];
      const fragment=document.createDocumentFragment();
      all.forEach((player,index)=>{
        const item=document.createElement('div');
        item.className='ranking-item';
        if(player.isYou) item.style.borderColor='rgba(255,77,0,.4)';

        const name=createEl('div','rank-name',player.name || 'Estudante');
        if(player.isYou){
          name.append(' ',createEl('span','you-badge','VOCE'));
        }

        item.append(
          createEl('div','rank-pos',medals[index] || index+1),
          createEl('div','rank-avatar',player.avatar || '🧑‍🚀'),
          name,
          createEl('div','rank-xp',`⚡ ${Number(player.xp || 0)} XP`)
        );
        fragment.appendChild(item);
      });

      list.replaceChildren(fragment);
    }

    return {
      checkStreakRewards,
      claimStreakReward,
      loadWordOfTheDay,
      renderRanking,
      updateUI
    };
  }

  window.LinguaFireHome={
    DEFAULT_RANKING_PLAYERS,
    createController
  };
})(window);
