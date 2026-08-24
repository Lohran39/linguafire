(function initPracticeModule(window){
  'use strict';

  function createController(options){
    const {
      $,
      createEl,
      setVisible,
      setWidth,
      state,
      isLoggedIn,
      getAuthHeaders,
      showToast,
      saveState,
      updateUI
    }=options;

    let srSessionCards=[];
    let srSessionIndex=0;
    let srWordRevealed=false;
    let allQuests=[];
    let currentQuestTab='daily';

    function clearElement(element){
      if(!element) return;
      element.replaceChildren();
    }

    function renderEmpty(container, icon, title){
      if(!container) return;
      const empty=createEl('div','empty-state');
      empty.append(
        createEl('div','empty-state-icon',icon),
        createEl('div','empty-state-title',title)
      );
      container.replaceChildren(empty);
    }

    function getQuestProgress(quest){
      const target=quest?.quest;
      if(target==='lessons') return Number(state.totalLessons || 0);
      if(target==='correct') return Number(state.totalCorrect || 0);
      if(target==='streak') return Number(state.streak || 0);
      if(target==='xp') return Number(state.xp || 0);
      return 0;
    }

    async function loadFlashcardStats(){
      const container=$('srStats');
      if(!await isLoggedIn()){
        renderEmpty(container,'🔒','Faça login para acessar');
        return;
      }

      try{
        const res=await fetch('/api/flashcards/stats',{
          headers:getAuthHeaders(),
          credentials:'include'
        });
        if(!res.ok) throw new Error('Erro ao carregar estatísticas de flashcards');

        const data=await res.json();
        const dueStat=createEl('div','sr-stat');
        dueStat.append(
          createEl('span','sr-stat-val',data.due ?? 0),
          createEl('span','sr-stat-label','Para revisar')
        );

        const totalStat=createEl('div','sr-stat');
        totalStat.append(
          createEl('span','sr-stat-val',data.total ?? 0),
          createEl('span','sr-stat-label','Total')
        );

        container?.replaceChildren(dueStat,totalStat);
      }catch(_error){
        renderEmpty(container,'⚠️','Erro ao carregar');
      }
    }

    async function startSRSession(){
      if(!await isLoggedIn()){
        showToast('Faça login primeiro','error');
        return;
      }

      try{
        const res=await fetch('/api/flashcards/available',{
          headers:getAuthHeaders(),
          credentials:'include'
        });
        if(!res.ok) throw new Error('Erro ao carregar flashcards');

        const data=await res.json();
        srSessionCards=Array.isArray(data.cards) ? data.cards : [];
        if(srSessionCards.length===0){
          showToast('🎉 Nenhum card para revisar agora!','info');
          return;
        }

        srSessionIndex=0;
        srWordRevealed=false;
        setVisible('srPractice',false);
        setVisible('srSession',true);
        setVisible('srDone',false);
        renderSRCard();
      }catch(_error){
        showToast('Erro ao carregar flashcards','error');
      }
    }

    function renderSRCard(){
      if(srSessionIndex>=srSessionCards.length){
        setVisible('srSession',false);
        setVisible('srDone',true);
        return;
      }

      const card=srSessionCards[srSessionIndex] || {};
      const pct=(srSessionIndex / srSessionCards.length) * 100;
      setWidth('srBar',`${pct}%`);
      $('srCount').textContent=`${srSessionIndex + 1}/${srSessionCards.length}`;
      $('srWord').textContent=`${card.word || ''}${card.isNew ? ' ✨' : ''}`;
      $('srTranslation').textContent='';
      $('srTranslation').classList.add('is-hidden');
      setVisible('srQuality',false);
      srWordRevealed=false;
    }

    function revealSRCard(){
      if(srWordRevealed || !srSessionCards[srSessionIndex]) return;
      srWordRevealed=true;
      $('srTranslation').textContent=srSessionCards[srSessionIndex].translation || '';
      $('srTranslation').classList.remove('is-hidden');
      setVisible('srQuality',true);
    }

    async function submitSRQuality(quality){
      if(!srWordRevealed || !srSessionCards[srSessionIndex]) return;

      const card=srSessionCards[srSessionIndex];
      try{
        const res=await fetch('/api/flashcards/review',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          credentials:'include',
          body:JSON.stringify({
            word:card.word,
            translation:card.translation,
            quality
          })
        });
        if(!res.ok) throw new Error('Erro ao salvar revisão');

        state.xp=Number(state.xp || 0) + (quality>=2 ? 5 : 2);
        state.totalCorrect=Number(state.totalCorrect || 0) + (quality>=3 ? 1 : 0);
        srSessionIndex+=1;
        saveState();
        updateUI();
        renderSRCard();
      }catch(_error){
        showToast('Erro ao salvar progresso','error');
      }
    }

    function endSRSession(){
      setVisible('srSession',false);
      setVisible('srDone',false);
      setVisible('srPractice',true);
      $('srDoneBackBtn')?.scrollIntoView();
      loadFlashcardStats();
    }

    async function loadQuests(){
      const container=$('questList');
      if(!await isLoggedIn()){
        renderEmpty(container,'🔒','Faça login para ver missões');
        return;
      }

      try{
        const res=await fetch('/api/quests',{
          headers:getAuthHeaders(),
          credentials:'include'
        });
        if(!res.ok) throw new Error('Erro ao carregar missões');

        const data=await res.json();
        allQuests=Array.isArray(data.quests) ? data.quests : [];
        renderQuests();
      }catch(_error){
        renderEmpty(container,'⚠️','Erro ao carregar missões');
      }
    }

    function switchQuestTab(tab){
      currentQuestTab=tab==='weekly' ? 'weekly' : 'daily';
      $('qtab-daily')?.classList.toggle('active',currentQuestTab==='daily');
      $('qtab-weekly')?.classList.toggle('active',currentQuestTab==='weekly');
      renderQuests();
    }

    function renderQuests(){
      const container=$('questList');
      if(!container) return;
      clearElement(container);

      const filtered=allQuests.filter((quest)=>{
        if(currentQuestTab==='daily') return quest.type==='daily' || !quest.type;
        return quest.type==='weekly';
      });

      if(filtered.length===0){
        renderEmpty(container,'📋','Sem missões disponíveis');
        return;
      }

      const fragment=document.createDocumentFragment();
      filtered.forEach((quest)=>{
        const progress=getQuestProgress(quest);
        const target=Math.max(Number(quest.target || 0),1);
        const percent=Math.min(100,Math.round((progress / target) * 100));
        const completed=progress>=target;

        const card=createEl('div',`quest-card${completed ? ' completed' : ''}`);
        const header=createEl('div','quest-header');
        const badgeType=quest.type==='weekly' ? 'weekly' : 'daily';
        header.append(
          createEl('span','quest-icon',completed ? '✅' : '⏳'),
          createEl('span','quest-name',quest.title || 'Missão'),
          createEl('span',`quest-badge ${badgeType} ${completed ? 'done' : ''}`,completed ? 'Feita!' : badgeType==='weekly' ? 'SEMANAL' : 'DIÁRIA')
        );

        const desc=createEl('div','quest-desc',quest.desc || '');
        const progressWrap=createEl('div','quest-progress');
        const bar=createEl('div','quest-bar');
        const fill=createEl('div','quest-bar-fill');
        fill.style.width=`${percent}%`;
        bar.appendChild(fill);
        progressWrap.append(
          bar,
          createEl('span','quest-bar-text',`${Math.min(progress,target)}/${target}`)
        );

        card.append(
          header,
          desc,
          progressWrap,
          createEl('div','quest-reward',`🏆 +${quest.reward || 0} XP`)
        );
        fragment.appendChild(card);
      });

      container.appendChild(fragment);
    }

    return {
      loadFlashcardStats,
      startSRSession,
      renderSRCard,
      revealSRCard,
      submitSRQuality,
      endSRSession,
      loadQuests,
      switchQuestTab,
      renderQuests
    };
  }

  window.LinguaFirePractice={createController};
})(window);
