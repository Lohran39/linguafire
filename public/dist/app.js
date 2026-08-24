
// ==================== ESTADO ====================
let state={name:'',xp:0,level:1,streak:0,lives:5,totalCorrect:0,totalLessons:0,achievements:[],lastPlayed:null,weeklyXp:120,englishLevel:'',favorites:[],theme:'default',googleLinked:false,hasFreeHint:false,xpMultiplier:0,xpMultiplierUntil:0,livesLastRegen:0,immersionMode:false,subscriptionActive:false,subscriptionExpires:0,aiUsesToday:0};
const LEVELS_APP=[{level:1,name:'Iniciante',xpNeeded:200},{level:2,name:'Aprendiz',xpNeeded:400},{level:3,name:'Explorador',xpNeeded:700},{level:4,name:'Comunicador',xpNeeded:1200},{level:5,name:'Fluente',xpNeeded:2000}];
const ACHIEVEMENTS_DEF=[{id:'first',icon:'🌟',name:'Primeira lição!'},{id:'streak3',icon:'🔥',name:'3 dias seguidos'},{id:'xp100',icon:'⚡',name:'Centurião — 100 XP'},{id:'perfect',icon:'💎',name:'Perfeito!'},{id:'music',icon:'🎵',name:'Amante de músicas'},{id:'lessons5',icon:'📚',name:'5 lições completas'},{id:'xp500',icon:'🏆',name:'500 XP acumulados'}];
const LEVEL_RESULTS={A1:{emoji:'🌱',name:'A1 — Iniciante',desc:'Você está começando! Foco nas bases: vocabulário simples, saudações e frases do dia a dia. Com prática diária você evolui rápido!',color:'#00ff88'},A2:{emoji:'🌿',name:'A2 — Básico',desc:'Você já conhece o básico! Hora de expandir vocabulário e praticar conversas simples. Vá na aba de músicas!',color:'#00d4ff'},B1:{emoji:'🌳',name:'B1 — Intermediário',desc:'Parabéns! Você já se vira em inglês. Foque em expressões idiomáticas, gírias e fluência.',color:'#ffcc00'},B2:{emoji:'🦅',name:'B2 — Intermediário Alto',desc:'Impressionante! Você domina bem o inglês. Polindo vocabulário avançado e nuances de escrita.',color:'#ff8c00'},C1:{emoji:'🏆',name:'C1 — Avançado',desc:'Nível avançado! Você domina o inglês. Foque em literaturas, sotaques e expressões sofisticadas.',color:'#ff4d00'}};
const LessonTools=window.LinguaFireLessons || {};
const PlacementModule=window.LinguaFirePlacement || {};
const shuffleArray=LessonTools.shuffleArray || ((items)=>[...(items || [])].sort(()=>Math.random()-.5));
const MusicCatalog=window.LinguaFireMusic || {};
const MusicPlayerModule=window.LinguaFireMusicPlayer || {};
const NativesModule=window.LinguaFireNatives || {};
const ProfileModule=window.LinguaFireProfile || {};
const AuthModule=window.LinguaFireAuth || {};
const ConversationModule=window.LinguaFireConversation || {};
const PracticeModule=window.LinguaFirePractice || {};
const ShopModule=window.LinguaFireShop || {};
const NotificationsModule=window.LinguaFireNotifications || {};
const RuntimeModule=window.LinguaFireRuntime || {};
const HomeModule=window.LinguaFireHome || {};
const FAVORITE_ICONS=MusicCatalog.FAVORITE_ICONS || ['🎵','🎸','🎹','🎤','🎶'];
const YOUTUBE_EMBED_BASE='https://www.youtube-nocookie.com/embed';
const THEME_LABELS=ProfileModule.THEME_LABELS || {default:'Tema padrao',light:'Tema light'};
const profileController=typeof ProfileModule.createController==='function'
  ? ProfileModule.createController({
    $,
    createEl,
    state,
    levelDefinitions:LEVELS_APP,
    levelResults:LEVEL_RESULTS,
    achievements:ACHIEVEMENTS_DEF,
    saveState,
    showToast
  })
  : null;
const authController=typeof AuthModule.createController==='function'
  ? AuthModule.createController({
    $,
    createEl,
    state,
    saveState,
    showScreen,
    updateUI,
    applyImmersionMode,
    showToast,
    startPlacementTest,
    normalizeTheme,
    applyTheme,
    login,
    register,
    loginWithGoogle,
    isLoggedIn,
    loadStateFromServer,
    loadLocalState:loadState,
    clearAuthSession,
    checkGoogleCallback,
    checkStreakRewards,
    getCurrentUserId:()=>typeof currentUserId!=='undefined' ? currentUserId : ''
  })
  : null;
const conversationController=typeof ConversationModule.createController==='function'
  ? ConversationModule.createController({
    $,
    setVisible,
    state,
    isLoggedIn,
    getAuthHeaders,
    showToast,
    loadStateFromServer
  })
  : null;
const practiceController=typeof PracticeModule.createController==='function'
  ? PracticeModule.createController({
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
  })
  : null;
const shopController=typeof ShopModule.createController==='function'
  ? ShopModule.createController({
    $,
    createEl,
    state,
    isLoggedIn,
    getAuthHeaders,
    showToast,
    saveState,
    updateUI
  })
  : null;
const notificationsController=typeof NotificationsModule.createController==='function'
  ? NotificationsModule.createController({
    state,
    isLoggedIn,
    getAuthHeaders,
    showToast
  })
  : null;
const runtimeController=typeof RuntimeModule.createController==='function'
  ? RuntimeModule.createController({
    state,
    saveState,
    updateUI,
    showToast
  })
  : null;
const homeController=typeof HomeModule.createController==='function'
  ? HomeModule.createController({
    $,
    createEl,
    state,
    levels:LEVELS_APP,
    setWidth,
    speakText,
    isLoggedIn,
    getAuthHeaders,
    showToast,
    loadStateFromServer
  })
  : null;

function normalizeTheme(theme){
  return typeof ProfileModule.normalizeTheme==='function'
    ? ProfileModule.normalizeTheme(theme)
    : (theme==='light' ? 'light' : 'default');
}

function updateThemeToggleUI(){
  if(profileController){
    profileController.updateThemeToggleUI();
    return;
  }

  const button=$('themeToggleBtn');
  if(!button) return;
  const currentTheme=normalizeTheme(state.theme);
  $('themeToggleIcon').textContent=currentTheme==='light' ? '☀️' : '🌙';
  $('themeToggleText').textContent=THEME_LABELS[currentTheme];
  button.setAttribute('aria-pressed', String(currentTheme==='light'));
  button.setAttribute('title', currentTheme==='light' ? 'Usando tema light' : 'Usando tema padrao');
}

function applyTheme(theme, persist=true){
  if(profileController){
    profileController.applyTheme(theme,persist);
    return;
  }

  const normalizedTheme=normalizeTheme(theme);
  state.theme=normalizedTheme;
  document.body.dataset.theme=normalizedTheme;
  updateThemeToggleUI();

  if(persist){
    saveState();
  }
}

function toggleTheme(){
  if(profileController){
    profileController.toggleTheme();
    return;
  }

  const nextTheme=normalizeTheme(state.theme)==='light' ? 'default' : 'light';
  applyTheme(nextTheme);
  showToast(`Tema alterado para ${THEME_LABELS[nextTheme].toLowerCase()}.`,'success');
}

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

  const watchUrl=getYouTubeWatchUrl(song.ytId);
  videoWrap.innerHTML=`
    <iframe src="${YOUTUBE_EMBED_BASE}/${song.ytId}?rel=0&modestbranding=1" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
    <a class="video-open-link" href="${watchUrl}" target="_blank" rel="noopener noreferrer">Abrir no YouTube</a>
  `;
}

// ==================== TESTE DE NIVELAMENTO ====================
const placementController=typeof PlacementModule.createController==='function'
  ? PlacementModule.createController({
    $,
    $$,
    createEl,
    setVisible,
    setWidth,
    state,
    questionBank:PlacementModule.QUESTION_BANK,
    levelResults:LEVEL_RESULTS,
    lessonTools:LessonTools,
    showToast,
    showLoginScreen,
    showScreen,
    saveState,
    updateUI
  })
  : null;

function startPlacementTest(){
  if(!placementController){
    showToast('Teste de nivelamento indisponivel. Recarregue a pagina.','error');
    return;
  }
  placementController.startPlacementTest();
}
function enterApp(){
  authController?.enterApp();
  initPushNotifications();
}

// ==================== VIDAS REGENERÁVEIS ====================
function initLivesRegen(){runtimeController?.initLivesRegen();}

// ==================== PRONÚNCIA / TTS ====================
function speakText(text, lang='en-US'){runtimeController?.speakText(text, lang);}
function testSpeechRecognition(){return Boolean(runtimeController?.testSpeechRecognition());}
function startSpeechRec(onResult, onEnd){runtimeController?.startSpeechRec(onResult, onEnd);}

// ==================== MOTOR DE MÚSICA ====================
const SONGS=MusicCatalog.SONGS || {};
const SUGGESTION_LIBRARY=MusicCatalog.SUGGESTION_LIBRARY || [];
const getAvailableSongsText=MusicCatalog.getAvailableSongsText || (()=>Object.values(SONGS).map(song=>song.title).join(', '));
const getSuggestionByKey=MusicCatalog.getSuggestionByKey || ((key)=>SUGGESTION_LIBRARY.find(suggestion=>suggestion.key===key) || null);
const findSongByQuery=MusicCatalog.findSongByQuery || (()=>null);
const musicPlayerController=typeof MusicPlayerModule.createController==='function'
  ? MusicPlayerModule.createController({
    $,
    $$,
    createEl,
    setVisible,
    setWidth,
    stripHtml,
    normalizeSongText,
    extractYouTubeId,
    shuffleArray,
    state,
    saveState,
    updateUI,
    showToast,
    speakText,
    floatXP,
    renderVideoPlayer,
    startKaraokeFromList,
    getVerifiedKaraokeQuestion,
    songs:SONGS,
    suggestionLibrary:SUGGESTION_LIBRARY,
    favoriteIcons:FAVORITE_ICONS,
    getAvailableSongsText,
    getSuggestionByKey,
    findSongByQuery
  })
  : null;

function switchMusicTab(tab){musicPlayerController?.switchMusicTab(tab);}
function renderSuggestions(){musicPlayerController?.renderSuggestions();}
async function loadSuggestion(key){await musicPlayerController?.loadSuggestion(key);}
async function loadFromYouTube(){await musicPlayerController?.loadFromYouTube();}
function openMusicPlayer(song,key){musicPlayerController?.openMusicPlayer(song,key);}
function closeMusicPlayer(){musicPlayerController?.closeMusicPlayer();}
function startKaraokeFromPlayer(){musicPlayerController?.startKaraokeFromPlayer();}
async function updateLyricsTranslations(lyrics){await musicPlayerController?.updateLyricsTranslations(lyrics);}
function renderLyrics(lyrics){musicPlayerController?.renderLyrics(lyrics);}
function toggleLyricDetail(index){musicPlayerController?.toggleLyricDetail(index);}
function setLyricMode(mode){musicPlayerController?.setLyricMode(mode);}
function toggleFavorite(){musicPlayerController?.toggleFavorite();}
function updateFavBtn(){musicPlayerController?.updateFavBtn();}
function renderFavorites(){musicPlayerController?.renderFavorites();}
function removeFav(key){musicPlayerController?.removeFav(key);}
function startMusicQuiz(){musicPlayerController?.startMusicQuiz();}
function nextQuizQ(){musicPlayerController?.nextQuizQ();}
function closeQuizResult(){musicPlayerController?.closeQuizResult();}
function closeQuiz(){musicPlayerController?.closeQuiz();}

const lessonController=typeof LessonTools.createController==='function'
  ? LessonTools.createController({
    $,
    $$,
    createEl,
    setVisible,
    setWidth,
    state,
    showScreen,
    showToast,
    floatXP,
    speakText,
    startSpeechRec,
    updateUI,
    saveState,
    notifyLessonCompleted,
    launchConfetti,
    showXpPopup,
    switchTab,
    switchMusicTab,
    normalizeSongText,
    levels:LEVELS_APP,
    youtubeEmbedBase:YOUTUBE_EMBED_BASE
  })
  : null;

function renderKaraokeList(){lessonController?.renderKaraokeList();}
function getVerifiedKaraokeQuestion(song,key=''){return lessonController?.getVerifiedKaraokeQuestion(song,key) || null;}
function startKaraokeFromList(karaokeSong){lessonController?.startKaraokeFromList(karaokeSong);}
function startLesson(type){lessonController?.startLesson(type);}
function renderQuestion(){lessonController?.renderQuestion();}
function startShadowingRecording(phrase,expected){lessonController?.startShadowingRecording(phrase,expected);}
function submitFillblankAnswer(correctAnswer){lessonController?.submitFillblankAnswer(correctAnswer);}
function promptCrosswordAnswer(clue){lessonController?.promptCrosswordAnswer(clue);}
function selectChoice(index,button){lessonController?.selectChoice(index,button);}
function addWordToAnswer(word,chip){lessonController?.addWordToAnswer(word,chip);}
function removeWordFromAnswer(wordEl,chip){lessonController?.removeWordFromAnswer(wordEl,chip);}
function submitAnswer(){lessonController?.submitAnswer();}
function nextQuestion(){lessonController?.nextQuestion();}
function updateLessonLives(){lessonController?.updateLessonLives();}
function finishLesson(){lessonController?.finishLesson();}
function exitLesson(){lessonController?.exitLesson();}
function returnHome(){lessonController?.returnHome();}
function playAgain(){lessonController?.playAgain();}

// ==================== ATUALIZAÇÕES DE INTERFACE ====================
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0,0);
}

function switchTab(tab){
  const tabEls={
    'home':'home-tab',
    'music':'music-tab',
    'flashcard':'flashcard-tab',
    'shop':'shop-tab',
    'conversation':'conversation-tab',
    'quests':'quests-tab',
    'ranking':'ranking-tab',
    'natives':'natives-tab',
    'profile':'profile-tab-content'
  };
  const navIds=['home','music','flashcard','shop','conversation','quests','ranking','natives','profile'];
  Object.entries(tabEls).forEach(([t,elId])=>{
    const el=$(elId);
    if(el)el.classList.toggle('active',t===tab);
  });
  navIds.forEach(id=>{
    const nav=$('nav-'+id);
    if(nav)nav.classList.toggle('active',id===tab);
  });
  if(tab==='ranking')renderRanking();
  if(tab==='profile')renderProfile();
  if(tab==='flashcard')loadFlashcardStats();
  if(tab==='shop')renderShop();
  if(tab==='conversation')loadConversationTopics();
  if(tab==='quests')loadQuests();
  if(tab==='natives')initNativesTab();
  if(tab==='home')loadWordOfTheDay();
}

async function loadWordOfTheDay() {
  await homeController?.loadWordOfTheDay();
}

async function checkStreakRewards() {
  await homeController?.checkStreakRewards();
}

async function claimStreakReward(rewardId, rewardMessage) {
  await homeController?.claimStreakReward(rewardId, rewardMessage);
}

function updateUI(){
  homeController?.updateUI();
}

function renderRanking(){
  homeController?.renderRanking();
}

function renderProfile(){
  if(profileController){
    profileController.renderProfile();
  }
}

// ==================== UTILITÁRIOS ====================
function saveState(syncToCloud=true){
  try{
    localStorage.setItem('linguafire_v2',JSON.stringify(state));
    if(syncToCloud) scheduleCloudSync();
  }catch(e){}
}
function loadState(){
  try{
    const d=localStorage.getItem('linguafire_v2');
    if(d){
      const s=JSON.parse(d);
      Object.assign(state,s);
    }
  }catch(e){}

  state.theme=normalizeTheme(state.theme);
  applyTheme(state.theme, false);
}

let toastTimer=null;
let syncStateTimer=null;
let isHydratingFromServer=false;

function getOnboardingStorageKey(){
  return authController?.getOnboardingStorageKey() || 'linguafire_onboarding_seen_guest';
}

function hasSeenOnboarding(){
  return Boolean(authController?.hasSeenOnboarding());
}

function persistOnboardingPreference(){
  authController?.persistOnboardingPreference();
}

function renderOnboardingStep(){
  authController?.renderOnboardingStep();
}

function finishOnboarding(){
  authController?.finishOnboarding();
}

function maybeStartOnboarding(force=false){
  return Boolean(authController?.maybeStartOnboarding(force));
}

function scheduleCloudSync(){
  if(typeof isLoggedIn!=='function' || typeof syncStateToServer!=='function') return;
  if(isHydratingFromServer || !isLoggedIn()) return;

  clearTimeout(syncStateTimer);
  syncStateTimer=setTimeout(()=>{
    syncStateToServer().catch(error=>{
      console.error('Erro no salvamento automatico:', error);
    });
  }, 800);
}

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

// ==================== MODO IMERSÃO ====================
function applyImmersionMode() {
  if(profileController){
    profileController.applyImmersionMode();
  }
}

function toggleImmersionMode() {
  if(profileController){
    profileController.toggleImmersionMode();
  }
}

// ==================== INICIALIZAÇÃO ====================

// Navegação para telas de auth
function showLoginScreen() {
  authController?.showLoginScreen();
}

function showRegisterScreen() {
  authController?.showRegisterScreen();
}

function showForgotPasswordScreen() {
  authController?.showForgotPasswordScreen();
}

function showResetPasswordScreen() {
  authController?.showResetPasswordScreen();
}

async function handleForgotPassword() {
  await authController?.handleForgotPassword();
}

async function handleResetPassword() {
  await authController?.handleResetPassword();
}

// Check for reset token on page load
function checkResetToken() {
  return Boolean(authController?.checkResetToken());
}

function hydrateStateFromUser(user) {
  authController?.hydrateStateFromUser(user);
}

function resolveInitialScreenAfterLogin() {
  authController?.resolveInitialScreenAfterLogin();
}

async function completeAuthenticatedEntry({forceOnboarding=false, showExpiredMessage=false}={}) {
  const entered=Boolean(await authController?.completeAuthenticatedEntry({forceOnboarding,showExpiredMessage}));
  if(entered) initPushNotifications();
  return entered;
}

// Event handlers de autenticação
async function handleLogin() {
  await authController?.handleLogin();
  initPushNotifications();
}

async function handleRegister() {
  await authController?.handleRegister();
  initPushNotifications();
}

function bindAuthEvents() {
  authController?.bindAuthEvents();
}

function bindStaticEvents(){
  bindAuthEvents();

  $('loadYoutubeBtn').addEventListener('click', loadFromYouTube);
  $('favBtn').addEventListener('click', toggleFavorite);
  $('musicQuizBtn').addEventListener('click', startMusicQuiz);
  $('musicKaraokeBtn').addEventListener('click', startKaraokeFromPlayer);
  $('closeMusicPlayerBtn').addEventListener('click', closeMusicPlayer);
  $('themeToggleBtn').addEventListener('click', toggleTheme);
  $('logoutBtn').addEventListener('click', logout);
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

  $$('[data-action="set-lyric-mode"]').forEach(element=>{
    element.addEventListener('click',()=>setLyricMode(element.dataset.lyricMode));
  });

  // Conversation
  $('convBackBtn').addEventListener('click', closeConversation);
  $('convSendBtn').addEventListener('click', sendConvMessage);
  $('convInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendConvMessage(); });

  // Upgrade Modal
  $('upgradeSubBtn')?.addEventListener('click', subscribePro);
  $('upgradeCloseBtn')?.addEventListener('click', hideUpgradeModal);

  // Flashcards
  $('srStartBtn').addEventListener('click', startSRSession);
  $('srRevealBtn').addEventListener('click', revealSRCard);
  $$('.sr-q-btn').forEach(btn => {
    btn.addEventListener('click', () => submitSRQuality(parseInt(btn.dataset.quality)));
  });
  $('srDoneBackBtn').addEventListener('click', endSRSession);

  // Quest tabs
  $$('[data-action="switch-quest-tab"]').forEach(el => {
    el.addEventListener('click', () => switchQuestTab(el.dataset.tab));
  });

  document.addEventListener('click',(event)=>{
    const suggestionCard=event.target.closest('[data-action="load-suggestion"]');
    if(suggestionCard){
      loadSuggestion(suggestionCard.dataset.songKey);
      return;
    }

    const removeButton=event.target.closest('[data-action="remove-favorite"]');
    if(removeButton){
      event.stopPropagation();
      removeFav(removeButton.dataset.favoriteKey);
    }

    const nativesThumb=event.target.closest('.natives-thumb');
    if(nativesThumb){
      const vid=nativesThumb.dataset.vid;
      const iframe=document.getElementById('nativesIframe');
      if(iframe) iframe.src=`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`;
      document.querySelectorAll('.natives-thumb').forEach(t=>t.classList.remove('active'));
      nativesThumb.classList.add('active');
      return;
    }

    const nativesRetryBtn=event.target.closest('.natives-retry-btn');
    if(nativesRetryBtn){
      const query=nativesRetryBtn.dataset.query || '';
      const lang=nativesRetryBtn.dataset.lang || $('nativesLang').value;
      $('nativesInput').value=query;
      $('nativesResultWord').textContent = `"${query}"`;
      doYGSearch(query, lang);
    }
  });

  const immBtn = document.getElementById('immersionToggleBtn');
  if (immBtn) immBtn.addEventListener('click', toggleImmersionMode);

  $('nativesSearchBtn').addEventListener('click', performNativesSearch);
  $('nativesInput').addEventListener('keydown', (e) => { if(e.key==='Enter') performNativesSearch(); });
  $('nativesNewSearchBtn').addEventListener('click', resetNativesSearch);

}

// ==================== NATIVOS (YOUTUBE EMBED) ====================
const nativesController=typeof NativesModule.createController==='function'
  ? NativesModule.createController({ $, createEl, setVisible, showToast })
  : null;

function doYGSearch(query, lang){
  return nativesController?.doSearch(query, lang);
}

function initNativesTab(){
  nativesController?.initTab();
}

function performNativesSearch(){
  nativesController?.performSearch();
}

function resetNativesSearch(){
  nativesController?.resetSearch();
}

// Inicialização principal
async function initApp() {
  const authFlow=await authController?.initializeAuthFlow();
  if(authFlow?.halt) return;

  initLivesRegen();
  applyImmersionMode();
  initPushNotifications();
}

// ==================== LOJA DE RECOMPENSAS ====================
async function renderShop(){
  await shopController?.renderShop();
}

async function buyShopItem(itemId){
  await shopController?.buyShopItem(itemId);
}

function showMysteryBoxReward(reward){
  shopController?.showMysteryBoxReward(reward);
}

// ==================== CONVERSA COM IA ====================
async function loadConversationTopics() {
  await conversationController?.loadConversationTopics();
}

function startConversation(topic) {
  conversationController?.startConversation(topic);
}

function addConvMessage(type, text) {
  conversationController?.addConvMessage(type,text);
}

function updateConvHint() {
  conversationController?.updateConvHint();
}

async function sendConvMessage() {
  await conversationController?.sendConvMessage();
}

function updateAIUsageCounter() {
  conversationController?.updateAIUsageCounter();
}

function showUpgradeModal() {
  conversationController?.showUpgradeModal();
}

function hideUpgradeModal() {
  conversationController?.hideUpgradeModal();
}

async function subscribePro() {
  await conversationController?.subscribePro();
}

function closeConversation() {
  conversationController?.closeConversation();
}

async function analyzeGrammarAfterConversation() {
  await conversationController?.analyzeGrammarAfterConversation();
}

// ==================== FLASHCARDS / MISSÕES ====================
async function loadFlashcardStats(){
  await practiceController?.loadFlashcardStats();
}

async function startSRSession(){
  await practiceController?.startSRSession();
}

function renderSRCard(){
  practiceController?.renderSRCard();
}

function revealSRCard(){
  practiceController?.revealSRCard();
}

async function submitSRQuality(quality){
  await practiceController?.submitSRQuality(quality);
}

function endSRSession(){
  practiceController?.endSRSession();
}

async function loadQuests(){
  await practiceController?.loadQuests();
}

function switchQuestTab(tab){
  practiceController?.switchQuestTab(tab);
}

function renderQuests(){
  practiceController?.renderQuests();
}

// ==================== PWA - NOTIFICAÇÕES PUSH ====================
async function initPushNotifications(){
  await notificationsController?.initPushNotifications();
}

function showPushNotificationPrompt(){
  notificationsController?.showPushNotificationPrompt();
}

async function subscribeToPush(){
  await notificationsController?.subscribeToPush();
}

function scheduleStreakReminder(){
  notificationsController?.scheduleStreakReminder();
}

function notifyLessonCompleted(){
  notificationsController?.handleLessonCompleted();
}

applyTheme(state.theme, false);
renderSuggestions();
bindStaticEvents();
initApp();

// Bind new events
document.addEventListener('click', (event) => {
  // Shop buy buttons
  const shopBuyBtn = event.target.closest('[data-shop-id]');
  if (shopBuyBtn) {
    event.preventDefault();
    buyShopItem(shopBuyBtn.dataset.shopId);
    return;
  }
});
