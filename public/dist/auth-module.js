(function initAuthModule(window){
  'use strict';

  const ONBOARDING_STEPS=Object.freeze([
    {icon:'🔥',title:'Bem-vindo ao LinguaFire',copy:'O LinguaFire agora junta música, vocabulário diário, contexto real e prática guiada em um fluxo mais completo.',points:['Letras com tradução e quiz para estudar ouvindo.','Seu progresso salva automaticamente na sua conta.']},
    {icon:'🌟',title:'Você sempre tem o que revisar',copy:'Além das lições, o app te puxa de volta com palavra do dia, favoritos e prática rápida.',points:['Palavra do dia para manter contato diário com o inglês.','Favoritas para revisar as músicas que mais funcionam para você.']},
    {icon:'🧭',title:'Cada aba resolve uma parte do estudo',copy:'O app foi organizado para reduzir travamento e te dar um próximo passo claro.',points:['Música, Flash e Nativos cobrem escuta, revisão e contexto.','Conversar e Missões ajudam a transformar estudo em rotina.']},
    {icon:'⚡',title:'Comece pelo que te prende',copy:'Você pode entrar por música, completar o nivelamento ou seguir as missões. O importante é voltar todo dia.',points:['XP e sequência mostram sua evolução em tempo real.','Quanto mais consistente você for, mais rápido o inglês destrava.']}
  ]);

  function noop(){}

  function fallbackCreateEl(tag,className,text){
    const element=document.createElement(tag);
    if(className) element.className=className;
    if(text!=null) element.textContent=String(text);
    return element;
  }

  function normalizeThemeFallback(theme){
    return theme==='light' ? 'light' : 'default';
  }

  function createController(options={}){
    const getEl=typeof options.$==='function' ? options.$ : (id)=>document.getElementById(id);
    const createEl=typeof options.createEl==='function' ? options.createEl : fallbackCreateEl;
    const state=options.state || {};
    const saveState=typeof options.saveState==='function' ? options.saveState : noop;
    const showScreen=typeof options.showScreen==='function' ? options.showScreen : noop;
    const updateUI=typeof options.updateUI==='function' ? options.updateUI : noop;
    const applyImmersionMode=typeof options.applyImmersionMode==='function' ? options.applyImmersionMode : noop;
    const showToast=typeof options.showToast==='function' ? options.showToast : noop;
    const startPlacementTest=typeof options.startPlacementTest==='function' ? options.startPlacementTest : noop;
    const normalizeTheme=typeof options.normalizeTheme==='function' ? options.normalizeTheme : normalizeThemeFallback;
    const applyTheme=typeof options.applyTheme==='function' ? options.applyTheme : noop;
    const login=typeof options.login==='function' ? options.login : null;
    const register=typeof options.register==='function' ? options.register : null;
    const loginWithGoogle=typeof options.loginWithGoogle==='function' ? options.loginWithGoogle : noop;
    const isLoggedIn=typeof options.isLoggedIn==='function' ? options.isLoggedIn : async()=>false;
    const loadStateFromServer=typeof options.loadStateFromServer==='function' ? options.loadStateFromServer : async()=>false;
    const loadLocalState=typeof options.loadLocalState==='function' ? options.loadLocalState : noop;
    const clearAuthSession=typeof options.clearAuthSession==='function' ? options.clearAuthSession : noop;
    const checkGoogleCallback=typeof options.checkGoogleCallback==='function' ? options.checkGoogleCallback : async()=>false;
    const checkStreakRewards=typeof options.checkStreakRewards==='function' ? options.checkStreakRewards : noop;
    const getCurrentUserId=typeof options.getCurrentUserId==='function' ? options.getCurrentUserId : ()=>'';

    let onboardingStep=0;

    function setError(id,message){
      const element=getEl(id);
      if(!element) return;
      element.textContent=message;
      element.classList.remove('is-hidden');
    }

    function hide(id){
      const element=getEl(id);
      if(element) element.classList.add('is-hidden');
    }

    function showLoginScreen(){
      showScreen('login');
      hide('loginError');
    }

    function showRegisterScreen(){
      showScreen('register');
      hide('registerError');
    }

    function showForgotPasswordScreen(){
      showScreen('forgot-password');
      hide('forgotError');
      hide('forgotSuccess');
    }

    function showResetPasswordScreen(){
      showScreen('reset-password');
      hide('resetError');
    }

    function getOnboardingStorageKey(){
      const userId=String(getCurrentUserId() || '').trim();
      const userName=String(state.name || 'guest').trim().toLowerCase();
      return `linguafire_onboarding_seen_${userId || userName || 'guest'}`;
    }

    function hasSeenOnboarding(){
      return localStorage.getItem(getOnboardingStorageKey())==='1';
    }

    function persistOnboardingPreference(){
      if(getEl('onboardingDontShow')?.checked){
        localStorage.setItem(getOnboardingStorageKey(),'1');
      }
    }

    function renderOnboardingStep(){
      const step=ONBOARDING_STEPS[onboardingStep];
      if(!step) return;

      const bar=getEl('onboardingBar');
      const points=getEl('onboardingPoints');
      if(bar) bar.style.width=`${((onboardingStep+1)/ONBOARDING_STEPS.length)*100}%`;

      if(getEl('onboardingIcon')) getEl('onboardingIcon').textContent=step.icon;
      if(getEl('onboardingTitle')) getEl('onboardingTitle').textContent=step.title;
      if(getEl('onboardingCopy')) getEl('onboardingCopy').textContent=step.copy;
      if(getEl('onboardingCount')) getEl('onboardingCount').textContent=`${onboardingStep+1} / ${ONBOARDING_STEPS.length}`;
      if(getEl('onboardingPrevBtn')) getEl('onboardingPrevBtn').disabled=onboardingStep===0;
      if(getEl('onboardingNextBtn')) getEl('onboardingNextBtn').textContent=onboardingStep===ONBOARDING_STEPS.length-1 ? 'Começar agora' : 'Próximo →';

      if(!points) return;
      points.textContent='';
      step.points.forEach((point)=>{
        const item=createEl('div','onboarding-point','');
        item.append(
          createEl('span','onboarding-point-icon','✓'),
          createEl('span','onboarding-point-text',point)
        );
        points.appendChild(item);
      });
    }

    function finishOnboarding(){
      persistOnboardingPreference();
      showScreen('app');
      updateUI();
      applyImmersionMode();
    }

    function maybeStartOnboarding(force=false){
      if(!force && hasSeenOnboarding()){
        showScreen('app');
        updateUI();
        applyImmersionMode();
        return false;
      }

      onboardingStep=0;
      if(getEl('onboardingDontShow')) getEl('onboardingDontShow').checked=true;
      renderOnboardingStep();
      showScreen('onboarding');
      return true;
    }

    function enterApp(){
      saveState();
      maybeStartOnboarding();
    }

    async function handleForgotPassword(){
      const email=getEl('forgotEmail')?.value.trim() || '';
      hide('forgotError');
      hide('forgotSuccess');

      if(!email){
        setError('forgotError','Digite seu email');
        return;
      }

      try{
        const response=await fetch('/api/auth/forgot-password',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email})
        });
        const data=await response.json();

        if(response.ok){
          const success=getEl('forgotSuccess');
          if(success){
            success.textContent=`✓ ${data.message}`;
            success.classList.remove('is-hidden');
          }
          if(getEl('forgotEmail')) getEl('forgotEmail').value='';
          return;
        }

        setError('forgotError',data.error || 'Erro ao processar');
      }catch(_error){
        setError('forgotError','Erro de conexão');
      }
    }

    async function handleResetPassword(){
      const token=new URLSearchParams(window.location.search).get('token') || '';
      const newPassword=getEl('resetPassword')?.value || '';
      const confirm=getEl('resetConfirm')?.value || '';
      hide('resetError');

      if(!token){
        setError('resetError','Token inválido. Solicite um novo link.');
        return;
      }

      if(!newPassword || newPassword.length<6){
        setError('resetError','Senha deve ter pelo menos 6 caracteres');
        return;
      }

      if(newPassword!==confirm){
        setError('resetError','As senhas não coincidem');
        return;
      }

      try{
        const response=await fetch('/api/auth/reset-password',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({token,newPassword})
        });
        const data=await response.json();

        if(response.ok){
          showToast('✓ Senha alterada com sucesso!','success');
          window.history.replaceState({},'',window.location.pathname);
          showLoginScreen();
          return;
        }

        setError('resetError',data.error || 'Erro ao redefinir senha');
      }catch(_error){
        setError('resetError','Erro de conexão');
      }
    }

    function checkResetToken(){
      const params=new URLSearchParams(window.location.search);
      const token=params.get('token');
      const isResetRoute=window.location.pathname.replace(/\/+$/,'').endsWith('/reset-password');
      if(token && isResetRoute){
        showResetPasswordScreen();
        return true;
      }
      return false;
    }

    function hydrateStateFromUser(user={}){
      state.name=user.name || '';
      state.level=user.level || 1;
      state.xp=user.xp || 0;
      state.streak=user.streak || 0;
      state.totalCorrect=user.correct_answers || 0;
      state.totalLessons=user.lessons_completed || 0;
      state.englishLevel=user.english_level || '';
      state.achievements=user.achievements || [];
      state.favorites=user.favorites || [];
      state.googleLinked=!!user.google_linked;
      state.theme=user.theme || state.theme || 'default';
      state.subscriptionActive=!!user.subscription_active;
      state.subscriptionExpires=user.subscription_expires || 0;
      state.aiUsesToday=user.ai_uses_today || 0;
      state.lives=5;
      applyTheme(state.theme,false);
    }

    function resolveInitialScreenAfterLogin(){
      if(!state.name){
        showLoginScreen();
        return;
      }

      if(!state.englishLevel){
        startPlacementTest();
        return;
      }

      maybeStartOnboarding();
    }

    async function completeAuthenticatedEntry({forceOnboarding=false,showExpiredMessage=false}={}){
      const loaded=await loadStateFromServer();

      if(!loaded){
        clearAuthSession();
        showLoginScreen();
        if(showExpiredMessage){
          showToast('Sua sessão expirou. Faça login novamente.','error');
        }
        return false;
      }

      if(forceOnboarding){
        maybeStartOnboarding(true);
      }else{
        resolveInitialScreenAfterLogin();
      }

      return true;
    }

    async function handleLogin(){
      if(!login){
        setError('loginError','Serviço de login indisponível');
        return;
      }

      const email=getEl('loginEmail')?.value.trim() || '';
      const password=getEl('loginPassword')?.value || '';
      hide('loginError');

      if(!email || !password){
        setError('loginError','Preencha email e senha');
        return;
      }

      try{
        await login(email,password);
        const loaded=await loadStateFromServer();

        if(!loaded){
          throw new Error('Nao foi possivel carregar sua conta agora');
        }

        showToast('Login realizado!','success');
        resolveInitialScreenAfterLogin();
      }catch(error){
        setError('loginError',error.message);
      }
    }

    async function handleRegister(){
      if(!register){
        setError('registerError','Serviço de cadastro indisponível');
        return;
      }

      const name=getEl('registerName')?.value.trim() || '';
      const email=getEl('registerEmail')?.value.trim() || '';
      const password=getEl('registerPassword')?.value || '';
      const confirm=getEl('registerConfirm')?.value || '';
      hide('registerError');

      if(!name || !email || !password){
        setError('registerError','Preencha todos os campos');
        return;
      }

      if(password.length<6){
        setError('registerError','A senha deve ter pelo menos 6 caracteres');
        return;
      }

      if(password!==confirm){
        setError('registerError','As senhas não coincidem');
        return;
      }

      try{
        const user=await register(name,email,password);
        state.name=user.name;
        state.level=1;
        state.xp=0;
        state.streak=0;
        state.totalCorrect=0;
        state.totalLessons=0;
        state.englishLevel='';
        state.achievements=[];
        state.favorites=[];
        state.googleLinked=false;
        state.theme=normalizeTheme(state.theme);
        applyTheme(state.theme,false);
        saveState();

        showToast('Conta criada!','success');
        startPlacementTest();
      }catch(error){
        setError('registerError',error.message);
      }
    }

    async function handleStartClick(){
      if(await isLoggedIn()){
        const entered=await completeAuthenticatedEntry({showExpiredMessage:true});
        if(entered) checkStreakRewards();
        return;
      }

      showLoginScreen();
    }

    async function initializeAuthFlow(){
      if(checkResetToken()){
        return {halt:true};
      }

      const googleLinkedMessage=window.sessionStorage.getItem('linguafire_google_linked');
      if(googleLinkedMessage){
        state.googleLinked=true;
        window.sessionStorage.removeItem('linguafire_google_linked');
        setTimeout(()=>showToast('Conta Google vinculada com sucesso!','success'),150);
      }

      if(await checkGoogleCallback()){
        await completeAuthenticatedEntry();
      }else{
        loadLocalState();

        if(await isLoggedIn()){
          const entered=await completeAuthenticatedEntry();
          if(!entered) showScreen('splash');
        }else{
          showScreen('splash');
        }
      }

      return {halt:false};
    }

    function bindClick(id,handler){
      const element=getEl(id);
      if(element) element.addEventListener('click',handler);
    }

    function bindAuthEvents(){
      bindClick('loginBtn',handleLogin);
      bindClick('googleLoginBtn',()=>loginWithGoogle());
      bindClick('showRegisterBtn',showRegisterScreen);
      bindClick('backToSplashBtn',()=>showScreen('splash'));

      bindClick('registerBtn',handleRegister);
      bindClick('googleRegisterBtn',()=>loginWithGoogle());
      bindClick('showLoginBtn',showLoginScreen);
      bindClick('backToSplashFromRegisterBtn',()=>showScreen('splash'));

      bindClick('forgotPasswordBtn',showForgotPasswordScreen);
      bindClick('sendResetBtn',handleForgotPassword);
      bindClick('backToLoginFromForgotBtn',showLoginScreen);

      bindClick('confirmResetBtn',handleResetPassword);
      bindClick('backToLoginFromResetBtn',showLoginScreen);

      bindClick('startBtn',handleStartClick);
      bindClick('enterAppBtn',enterApp);
      bindClick('onboardingPrevBtn',()=>{
        if(onboardingStep>0){
          onboardingStep--;
          renderOnboardingStep();
        }
      });
      bindClick('onboardingSkipBtn',finishOnboarding);
      bindClick('onboardingNextBtn',()=>{
        if(onboardingStep>=ONBOARDING_STEPS.length-1){
          finishOnboarding();
          return;
        }
        onboardingStep++;
        renderOnboardingStep();
      });
    }

    return {
      showLoginScreen,
      showRegisterScreen,
      showForgotPasswordScreen,
      showResetPasswordScreen,
      getOnboardingStorageKey,
      hasSeenOnboarding,
      persistOnboardingPreference,
      renderOnboardingStep,
      finishOnboarding,
      maybeStartOnboarding,
      enterApp,
      handleForgotPassword,
      handleResetPassword,
      checkResetToken,
      hydrateStateFromUser,
      resolveInitialScreenAfterLogin,
      completeAuthenticatedEntry,
      handleLogin,
      handleRegister,
      handleStartClick,
      initializeAuthFlow,
      bindAuthEvents
    };
  }

  window.LinguaFireAuth={
    ONBOARDING_STEPS,
    createController
  };
})(window);
