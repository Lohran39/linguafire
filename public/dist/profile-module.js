(function initProfileModule(window){
  'use strict';

  const THEME_LABELS=Object.freeze({
    default:'Tema padrao',
    light:'Tema light'
  });

  const ADVANCED_LEVELS=new Set(['B1','B2','C1']);

  const IMMERSION_NAV=Object.freeze({
    home:'Home',
    music:'Music',
    flashcard:'Flash',
    conversation:'Chat',
    profile:'Profile'
  });

  const DEFAULT_NAV=Object.freeze({
    home:'Início',
    music:'Música',
    flashcard:'Flash',
    conversation:'Conversar',
    profile:'Perfil'
  });

  const NAV_ITEMS=Object.freeze([
    ['nav-home','home'],
    ['nav-music','music'],
    ['nav-flashcard','flashcard'],
    ['nav-conversation','conversation'],
    ['nav-profile','profile']
  ]);

  function normalizeTheme(theme){
    return theme==='light' ? 'light' : 'default';
  }

  function isImmersionEligible(englishLevel){
    return ADVANCED_LEVELS.has(englishLevel);
  }

  function fallbackCreateEl(tag, className, text){
    const element=document.createElement(tag);
    if(className) element.className=className;
    if(text!=null) element.textContent=String(text);
    return element;
  }

  function setText(element, value){
    if(element) element.textContent=String(value ?? '');
  }

  function createController(options={}){
    const getEl=typeof options.$==='function'
      ? options.$
      : (id)=>document.getElementById(id);
    const createEl=typeof options.createEl==='function'
      ? options.createEl
      : fallbackCreateEl;
    const state=options.state || {};
    const levelDefinitions=Array.isArray(options.levelDefinitions) ? options.levelDefinitions : [];
    const levelResults=options.levelResults || {};
    const achievements=Array.isArray(options.achievements) ? options.achievements : [];
    const saveState=typeof options.saveState==='function' ? options.saveState : function noop(){};
    const showToast=typeof options.showToast==='function' ? options.showToast : function noop(){};

    function getCurrentLevel(){
      const fallback={name:'Iniciante'};
      if(!levelDefinitions.length) return fallback;

      const rawIndex=Number(state.level || 1)-1;
      const safeIndex=Math.min(Math.max(rawIndex,0),levelDefinitions.length-1);
      return levelDefinitions[safeIndex] || fallback;
    }

    function updateThemeToggleUI(){
      const button=getEl('themeToggleBtn');
      if(!button) return;

      const currentTheme=normalizeTheme(state.theme);
      setText(getEl('themeToggleIcon'),currentTheme==='light' ? '☀️' : '🌙');
      setText(getEl('themeToggleText'),THEME_LABELS[currentTheme]);
      button.setAttribute('aria-pressed',String(currentTheme==='light'));
      button.setAttribute('title',currentTheme==='light' ? 'Usando tema light' : 'Usando tema padrao');
    }

    function applyTheme(theme,persist=true){
      const normalizedTheme=normalizeTheme(theme);
      state.theme=normalizedTheme;
      document.body.dataset.theme=normalizedTheme;
      updateThemeToggleUI();

      if(persist){
        saveState();
      }
    }

    function toggleTheme(){
      const nextTheme=normalizeTheme(state.theme)==='light' ? 'default' : 'light';
      applyTheme(nextTheme);
      showToast(`Tema alterado para ${THEME_LABELS[nextTheme].toLowerCase()}.`,'success');
    }

    function renderProfile(){
      const currentLevel=getCurrentLevel();
      const englishResult=levelResults[state.englishLevel] || {};
      const userAchievements=Array.isArray(state.achievements) ? state.achievements : [];

      setText(getEl('profileName'),state.name || 'Estudante');
      setText(getEl('profileLevel'),`Nível ${state.level || 1} — ${currentLevel.name}`);
      setText(
        getEl('profileEnLevel'),
        state.englishLevel ? `Inglês: ${state.englishLevel} — ${englishResult.name || ''}` : ''
      );
      setText(getEl('totalXpStat'),state.xp || 0);
      setText(getEl('streakStat'),state.streak || 0);
      setText(getEl('correctStat'),state.totalCorrect || 0);
      setText(getEl('lessonsStat'),state.totalLessons || 0);

      const achievementList=getEl('achievementsList');
      if(achievementList){
        achievementList.textContent='';
        achievements.forEach((achievement)=>{
          const unlocked=userAchievements.includes(achievement.id);
          const item=document.createElement('div');
          item.className=`ach-item${unlocked ? '' : ' locked'}`;
          item.append(
            createEl('span','ach-icon',achievement.icon),
            createEl('span','ach-name',achievement.name)
          );
          achievementList.appendChild(item);
        });
      }

      const immersionContainer=getEl('immersionToggleContainer');
      if(immersionContainer){
        immersionContainer.style.display=isImmersionEligible(state.englishLevel) ? '' : 'none';
      }

      const immersionButton=getEl('immersionToggleBtn');
      if(immersionButton){
        immersionButton.textContent=state.immersionMode ? '🌍 Desativar Imersão' : '🌍 Ativar Modo Imersão';
      }
    }

    function applyImmersionMode(){
      const on=Boolean(state.immersionMode && isImmersionEligible(state.englishLevel));
      document.body.classList.toggle('immersion-mode',on);

      NAV_ITEMS.forEach(([id,key])=>{
        const item=document.getElementById(id);
        if(!item) return;

        const label=item.querySelector('span:last-child');
        if(label) label.textContent=on ? IMMERSION_NAV[key] : DEFAULT_NAV[key];
      });

      const submitButton=document.getElementById('submitBtn');
      if(submitButton && !submitButton.disabled){
        submitButton.textContent=on ? 'Check ✓' : 'Verificar ✓';
      }

      const continueButton=document.getElementById('continueBtn');
      if(continueButton){
        if(on && continueButton.textContent.includes('Continuar')){
          continueButton.textContent='Continue →';
        }else if(!on && continueButton.textContent.includes('Continue')){
          continueButton.textContent='Continuar →';
        }
      }

      let banner=document.getElementById('immersionBanner');
      if(on){
        if(!banner){
          const app=document.getElementById('app');
          if(!app) return;

          banner=document.createElement('div');
          banner.id='immersionBanner';
          banner.className='immersion-banner';
          banner.textContent='🌍 Immersion Mode — Interface in English';
          app.insertBefore(banner,app.firstChild);
        }
        return;
      }

      if(banner) banner.remove();
    }

    function toggleImmersionMode(){
      if(!isImmersionEligible(state.englishLevel)){
        showToast('Imersão disponível a partir do nível B1','info');
        return;
      }

      state.immersionMode=!state.immersionMode;
      saveState();
      applyImmersionMode();
      showToast(state.immersionMode ? '🌍 Immersion Mode ON!' : '🇧🇷 Modo normal ativado','success');
    }

    return {
      normalizeTheme,
      updateThemeToggleUI,
      applyTheme,
      toggleTheme,
      renderProfile,
      applyImmersionMode,
      toggleImmersionMode
    };
  }

  window.LinguaFireProfile={
    THEME_LABELS,
    normalizeTheme,
    isImmersionEligible,
    createController
  };
})(window);
