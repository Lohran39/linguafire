(function(){
  'use strict';

  function createController(options={}){
    const $=options.$ || ((id)=>document.getElementById(id));
    const $$=options.$$ || ((selector, root=document)=>Array.from(root.querySelectorAll(selector)));
    const createEl=options.createEl || ((tag,className='',text='')=>{
      const element=document.createElement(tag);
      if(className) element.className=className;
      if(text!==undefined && text!==null) element.textContent=String(text);
      return element;
    });
    const setVisible=options.setVisible || ((id, visible)=>{
      const element=$(id);
      if(element) element.classList.toggle('is-hidden', !visible);
    });
    const setWidth=options.setWidth || ((id,value)=>{
      const element=$(id);
      if(element) element.style.width=value;
    });
    const stripHtml=options.stripHtml || ((value='')=>{
      const tmp=document.createElement('div');
      tmp.innerHTML=String(value);
      return tmp.textContent || tmp.innerText || '';
    });
    const normalizeSongText=options.normalizeSongText || ((value='')=>String(value).toLowerCase().trim());
    const extractYouTubeId=options.extractYouTubeId || (()=>null);
    const shuffleArray=options.shuffleArray || ((items)=>[...items].sort(()=>Math.random()-.5));
    const state=options.state || {};
    const saveState=options.saveState || (()=>{});
    const updateUI=options.updateUI || (()=>{});
    const showToast=options.showToast || (()=>{});
    const speakText=options.speakText || (()=>{});
    const floatXP=options.floatXP || (()=>{});
    const renderVideoPlayer=options.renderVideoPlayer || (()=>{});
    const startKaraokeFromList=options.startKaraokeFromList || (()=>{});
    const getVerifiedKaraokeQuestion=options.getVerifiedKaraokeQuestion || (()=>null);
    const SONGS=options.songs || {};
    const SUGGESTION_LIBRARY=options.suggestionLibrary || [];
    const FAVORITE_ICONS=options.favoriteIcons || ['🎵','🎸','🎹','🎤','🎶'];
    const getAvailableSongsText=options.getAvailableSongsText || (()=>Object.values(SONGS).map(song=>song.title).join(', '));
    const getSuggestionByKey=options.getSuggestionByKey || ((key)=>SUGGESTION_LIBRARY.find(suggestion=>suggestion.key===key) || null);

    const suggestionLyricsCache=Object.create(null);
    let currentSong=null;
    let lyricMode='en';
    let quizQs=[];
    let quizCurrent=0;
    let quizCorrect=0;
    let quizAnswered=false;
    let activeMusicTab='search';

    function favorites(){
      if(!Array.isArray(state.favorites)) state.favorites=[];
      return state.favorites;
    }

    function safeText(value, fallback=''){
      const text=String(value || '').trim();
      return text || fallback;
    }

    function safeLyrics(lines){
      return Array.isArray(lines) ? lines : [];
    }

    function switchMusicTab(tab){
      const normalizedTab=tab==='favs' ? 'favs' : 'search';
      activeMusicTab=normalizedTab;
      $('mtab-search')?.classList.toggle('active',normalizedTab==='search');
      $('mtab-favs')?.classList.toggle('active',normalizedTab==='favs');
      setVisible('music-search-panel', normalizedTab==='search');
      setVisible('music-favs-panel', normalizedTab==='favs');
      if(normalizedTab==='favs') renderFavorites();
    }

    function buildSongFromSuggestion(suggestion){
      const localSong=SONGS[suggestion.key];
      return {
        title:suggestion.title,
        artist:suggestion.artist,
        ytId:suggestion.ytId,
        level:suggestion.level || 'Livre',
        lyrics:ensureLyrics(localSong?.lyrics, [], suggestion.title)
      };
    }

    function renderSuggestions(){
      const container=$('suggestions');
      if(!container) return;

      container.innerHTML='';
      shuffleArray([...SUGGESTION_LIBRARY]).slice(0,4).forEach(suggestion=>{
        const card=document.createElement('div');
        card.className='sugg-card';
        card.dataset.action='load-suggestion';
        card.dataset.songKey=suggestion.key;
        const thumb=createEl('div','sugg-thumb',suggestion.thumb);
        const meta=createEl('div','sugg-meta','');
        meta.append(
          createEl('div','sugg-title',suggestion.title),
          createEl('div','sugg-artist',`${suggestion.artist} • ${suggestion.level}`)
        );
        card.append(thumb,meta,createEl('span','sugg-arrow','▶'));
        container.appendChild(card);
      });
    }

    async function fetchYouTubeMeta(url){
      try{
        const proxyUrl=`/api/youtube/oembed?url=${encodeURIComponent(url)}`;
        const response=await fetch(proxyUrl);
        if(response.ok){
          const data=await response.json();
          if(data?.title){
            return {
              title:data.title,
              author:data.author || ''
            };
          }
        }
      }catch(_err){}

      const endpoints=[
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        `https://noembed.com/embed?url=${encodeURIComponent(url)}`
      ];

      for(const endpoint of endpoints){
        try{
          const response=await fetch(endpoint);
          if(!response.ok) continue;
          const data=await response.json();
          if(data?.title){
            return {
              title:data.title,
              author:data.author_name || ''
            };
          }
        }catch(_err){}
      }

      return {title:'', author:''};
    }

    function buildFallbackLyrics(title){
      return [{
        en:`Lyrics were not found automatically for "${title}".`,
        pt:`A letra de "${title}" não foi encontrada automaticamente.`,
        explain:`Tente abrir outra sugestão ou colar um link do YouTube. Disponíveis agora: <strong>${getAvailableSongsText()}</strong>.`
      }];
    }

    function ensureLyrics(lines, fallbackLines, title){
      const preferredLines=safeLyrics(lines).filter(line=>line && typeof line.en==='string' && line.en.trim().length>0);
      if(preferredLines.length) return preferredLines;

      const fallback=safeLyrics(fallbackLines).filter(line=>line && typeof line.en==='string' && line.en.trim().length>0);
      return fallback.length ? fallback : buildFallbackLyrics(title);
    }

    function buildFavoriteEntry(song,key){
      return {
        key:key || song.ytId || normalizeSongText(`${song.title} ${song.artist}`) || `fav-${Date.now()}`,
        title:song.title,
        artist:song.artist,
        ytId:song.ytId || '',
        level:song.level || 'Livre',
        lyrics:ensureLyrics(song.lyrics, [], song.title),
        syncedLyrics:song.syncedLyrics || null,
        lyricsDuration:song.lyricsDuration || null,
        lyricsSource:song.lyricsSource || ''
      };
    }

    function buildSongFromFavorite(favorite){
      if(SONGS[favorite.key]){
        return {...SONGS[favorite.key], ytId:favorite.ytId || SONGS[favorite.key].ytId};
      }

      return {
        title:favorite.title,
        artist:favorite.artist,
        ytId:favorite.ytId,
        level:favorite.level || 'Livre',
        lyrics:ensureLyrics(favorite.lyrics, [], favorite.title),
        syncedLyrics:favorite.syncedLyrics || null,
        lyricsDuration:favorite.lyricsDuration || null,
        lyricsSource:favorite.lyricsSource || ''
      };
    }

    function buildReliableYouTubeMetadata(title, artist){
      if(window.LyricsService?.buildReliableYouTubeMetadata){
        return window.LyricsService.buildReliableYouTubeMetadata(title, artist);
      }

      const parts=String(title || '').split(/\s+-\s+/);
      if(parts.length>=2){
        return {
          artistOriginal:artist || parts[0].trim(),
          trackOriginal:parts.slice(1).join(' - ').trim()
        };
      }

      return {artistOriginal:artist || '', trackOriginal:title || ''};
    }

    async function translateLyricsInBackground(lines){
      if(!Array.isArray(lines) || !window.LyricsService?.translateLine) return;

      const batchSize=4;
      for(let index=0;index<lines.length;index+=batchSize){
        const batch=lines.slice(index,index+batchSize);
        await Promise.all(batch.map(async line=>{
          if(!line.pt && line.en){
            line.pt=await window.LyricsService.translateLine(line);
          }
        }));
        updateLyricsTranslations(lines);
      }
    }

    async function loadSuggestion(key){
      const suggestion=getSuggestionByKey(key);
      if(!suggestion) return;

      const cachedLyrics=suggestionLyricsCache[key];
      if(cachedLyrics){
        openMusicPlayer({...buildSongFromSuggestion(suggestion), lyrics:cachedLyrics}, key);
        return;
      }

      showToast('🔍 Buscando letra completa da sugestão...','info');
      const baseSong=buildSongFromSuggestion(suggestion);

      if(window.LyricsService?.fetchLyrics){
        try{
          const lyricsResult=await window.LyricsService.fetchLyrics(baseSong.title, baseSong.artist, baseSong.ytId);
          if(lyricsResult){
            const converted=window.LyricsService.convertToAppLyricsSync
              ? window.LyricsService.convertToAppLyricsSync(lyricsResult, 300)
              : lyricsResult.lyrics;
            const appLyrics=ensureLyrics(converted, baseSong.lyrics, baseSong.title);
            suggestionLyricsCache[key]=appLyrics;
            openMusicPlayer({
              ...baseSong,
              lyrics:appLyrics,
              lyricsSource:lyricsResult.source,
              syncedLyrics:lyricsResult.rawSynced,
              lyricsDuration:lyricsResult.duration
            }, key);
            if(appLyrics.some(line=>!line.pt && line.en)){
              setTimeout(()=>translateLyricsInBackground(appLyrics),0);
            }
            showToast(`📜 Letra completa carregada via ${lyricsResult.source}!`,'success');
            return;
          }
        }catch(error){
          console.error('Erro ao carregar sugestão:', error);
        }
      }

      openMusicPlayer(baseSong,key);
      showToast('Abrindo sugestão com o conteúdo local disponível.','info');
    }

    async function loadFromYouTube(){
      const input=$('ytLinkInput');
      const url=input?.value.trim() || '';
      if(!url){
        showToast('Cole um link do YouTube!','error');
        return;
      }

      const ytId=extractYouTubeId(url);
      if(!ytId){
        showToast('Link inválido! Use um link do YouTube.','error');
        return;
      }

      input.value='';
      showToast('🔍 Buscando letra...','info');

      const foundById=Object.entries(SONGS).find(([_,song])=>song.ytId===ytId);
      if(foundById){
        openMusicPlayer(foundById[1],foundById[0]);
        return;
      }

      let title='Música do YouTube';
      let artist='';
      const fetchedMeta=await fetchYouTubeMeta(url);
      const fetchedTitle=fetchedMeta.title || '';
      if(fetchedTitle) title=fetchedTitle;
      if(fetchedMeta.author) artist=fetchedMeta.author;

      let lyricsResult={success:false, reason:'Letra não encontrada automaticamente'};
      try{
        if(window.LyricsService?.fetchLyricsForYouTube){
          lyricsResult=await window.LyricsService.fetchLyricsForYouTube(ytId, fetchedTitle || title, artist);
        }
      }catch(error){
        console.error('Erro ao buscar letra do YouTube:', error);
        lyricsResult={success:false, reason:'Não foi possível buscar a letra agora'};
      }

      if(lyricsResult?.success){
        const {trackOriginal, artistOriginal}=buildReliableYouTubeMetadata(fetchedTitle || title, artist);
        const converted=window.LyricsService?.convertToAppLyrics
          ? await window.LyricsService.convertToAppLyrics(lyricsResult, 100)
          : lyricsResult.lyrics;
        const appLyrics=ensureLyrics(converted, [], trackOriginal || title);

        setTimeout(()=>updateLyricsTranslations(appLyrics),500);
        openMusicPlayer({
          title:trackOriginal || title,
          artist:artistOriginal || artist || 'Artista desconhecido',
          ytId,
          level:'Livre',
          lyrics:appLyrics,
          lyricsSource:lyricsResult.source,
          syncedLyrics:lyricsResult.rawSynced,
          lyricsDuration:lyricsResult.duration
        }, `lrclib-${ytId}`);

        const syncedLabel=lyricsResult.synced ? ' (sincronizada!)' : '';
        const lineCount=lyricsResult.lyrics?.length || appLyrics.length;
        showToast(`📜 Letra encontrada no ${lyricsResult.source}${syncedLabel} (${lineCount} linhas)`,'success');
        return;
      }

      openMusicPlayer({
        title,
        artist:'Vídeo carregado ▶',
        ytId,
        level:'Livre',
        lyrics:buildFallbackLyrics(title)
      }, `custom-${ytId}`);
      showToast(`⚠️ ${lyricsResult.reason}. Tente outra sugestão ou um link do YouTube.`,'info');
    }

    function openMusicPlayer(song,key){
      currentSong={song,key};
      setVisible('music-search-panel', false);
      setVisible('music-favs-panel', false);
      setVisible('music-player', true);

      const titleEl=$('playerTitle');
      const artistEl=$('playerArtist');
      if(titleEl) titleEl.textContent=safeText(song.title, 'Música');
      if(artistEl) artistEl.textContent=safeText(song.artist, 'Artista desconhecido')+(song.level?' • '+song.level:'');

      updateFavBtn();
      renderVideoPlayer(song);

      const karaokeBtn=$('musicKaraokeBtn');
      const verifiedKaraoke=getVerifiedKaraokeQuestion(song,key);
      if(karaokeBtn){
        karaokeBtn.classList.toggle('is-hidden', !verifiedKaraoke);
        karaokeBtn.disabled=!verifiedKaraoke;
        karaokeBtn.title=verifiedKaraoke ? 'Abrir modo karaokê' : 'Karaokê disponível apenas para músicas verificadas do app';
      }

      lyricMode='en';
      ['en','both'].forEach(mode=>$(`tog-${mode}`)?.classList.toggle('active',mode==='en'));
      renderLyrics(song.lyrics);
      if(!Array.isArray(state.achievements)) state.achievements=[];
      if(!state.achievements.includes('music')){
        state.achievements.push('music');
        saveState();
        showToast('🏅 Conquista: Amante de músicas!','info');
      }
    }

    function closeMusicPlayer(){
      setVisible('music-player', false);
      switchMusicTab(activeMusicTab);
      const videoWrap=$('videoWrap');
      if(videoWrap){
        videoWrap.innerHTML='<div class="video-placeholder"><div class="vp-icon">🎵</div><p class="video-status">Carregando...</p></div>';
      }
      currentSong=null;
    }

    function startKaraokeFromPlayer(){
      if(!currentSong?.song){
        showToast('Carregue uma música primeiro!','error');
        return;
      }

      const verifiedKaraoke=getVerifiedKaraokeQuestion(currentSong.song, currentSong.key);
      if(verifiedKaraoke){
        startKaraokeFromList(verifiedKaraoke);
        return;
      }

      showToast('Karaokê no player fica disponível apenas para músicas verificadas do app. Vídeos externos podem ter legenda e áudio diferentes.','info');
    }

    async function updateLyricsTranslations(lyrics){
      if(!currentSong?.song?.lyrics) return;

      safeLyrics(lyrics).forEach((line,index)=>{
        const lineEl=$(`lyric-${index}`);
        const ptEl=lineEl?.querySelector('.lyric-pt');
        if(ptEl && line.pt) ptEl.textContent=line.pt;
      });
    }

    function renderLyrics(lyrics){
      const body=$('lyricsBody');
      if(!body) return;

      body.innerHTML='';
      ensureLyrics(lyrics, [], currentSong?.song?.title || 'Música').forEach((line,index)=>{
        const div=document.createElement('div');
        div.className='lyric-line';
        div.id=`lyric-${index}`;

        const ptText=line.pt || (line.pt==='' ? '⏳ Traduzindo...' : '');
        const speakBtn=createEl('button','lyric-speak-btn','🔊');
        speakBtn.type='button';
        speakBtn.dataset.lyricText=line.en || '';
        speakBtn.title='Ouvir pronúncia';

        div.append(
          speakBtn,
          createEl('div','lyric-en',line.en || ''),
          createEl('div','lyric-pt'+(lyricMode!=='en'?' show':''),ptText),
          createEl('div','lyric-explain',stripHtml(line.explain || ''))
        );

        div.addEventListener('click',()=>toggleLyricDetail(index));
        speakBtn.addEventListener('click',(event)=>{
          event.stopPropagation();
          speakText(line.en || '');
        });
        body.appendChild(div);
      });
    }

    function toggleLyricDetail(index){
      const line=$(`lyric-${index}`);
      if(!line) return;

      const isActive=line.classList.contains('active-line');
      document.querySelectorAll('.lyric-line').forEach(element=>{
        element.classList.remove('active-line');
        const pt=element.querySelector('.lyric-pt');
        const explain=element.querySelector('.lyric-explain');
        if(lyricMode==='en') pt?.classList.remove('show');
        explain?.classList.remove('show');
      });

      if(!isActive){
        line.classList.add('active-line');
        line.querySelector('.lyric-pt')?.classList.add('show');
        line.querySelector('.lyric-explain')?.classList.add('show');
      }
    }

    function setLyricMode(mode){
      lyricMode=mode==='both' ? 'both' : 'en';
      ['en','both'].forEach(item=>$(`tog-${item}`)?.classList.toggle('active',item===lyricMode));
      $$('.lyric-pt').forEach(element=>element.classList.toggle('show',lyricMode!=='en'));
    }

    function toggleFavorite(){
      if(!currentSong) return;

      const {key,song}=currentSong;
      const list=favorites();
      const index=list.findIndex(favorite=>favorite.key===key || (favorite.ytId && song.ytId && favorite.ytId===song.ytId));

      if(index>=0){
        list.splice(index,1);
        showToast('Removida dos favoritos','info');
      }else{
        list.push(buildFavoriteEntry(song,key));
        showToast('❤️ Salva nos favoritos!','success');
      }

      updateFavBtn();
      saveState();
    }

    function updateFavBtn(){
      if(!currentSong) return;

      const isFav=favorites().some(favorite=>favorite.key===currentSong.key || (favorite.ytId && currentSong.song.ytId && favorite.ytId===currentSong.song.ytId));
      const btn=$('favBtn');
      if(!btn) return;

      btn.textContent=isFav?'❤️ Salva':'❤️ Salvar';
      btn.classList.toggle('faved',isFav);
    }

    function renderFavorites(){
      const list=$('favsList');
      if(!list) return;

      list.innerHTML='';
      if(!favorites().length){
        setVisible('favsEmpty', true);
        return;
      }

      setVisible('favsEmpty', false);
      favorites().forEach((fav,index)=>{
        const div=document.createElement('div');
        div.className='sugg-card';
        div.dataset.favoriteKey=fav.key;

        const thumb=createEl('div','sugg-thumb',FAVORITE_ICONS[index%FAVORITE_ICONS.length]);
        const meta=createEl('div','sugg-meta','');
        const removeBtn=createEl('button','fav-remove','✕');
        removeBtn.type='button';
        removeBtn.dataset.action='remove-favorite';
        removeBtn.dataset.favoriteKey=fav.key || '';
        meta.append(
          createEl('div','sugg-title',fav.title || 'Música sem título'),
          createEl('div','sugg-artist',`${fav.artist || 'Artista desconhecido'}${fav.level?' • '+fav.level:''}`)
        );
        div.append(thumb,meta,removeBtn);
        div.addEventListener('click',(event)=>{
          if(event.target.closest('[data-action="remove-favorite"]')) return;
          openMusicPlayer(buildSongFromFavorite(fav),fav.key);
        });
        list.appendChild(div);
      });
    }

    function removeFav(key){
      state.favorites=favorites().filter(favorite=>favorite.key!==key);
      saveState();
      renderFavorites();
      showToast('Removida dos favoritos','info');
    }

    function startMusicQuiz(){
      if(!currentSong?.song) return;

      const lyrics=ensureLyrics(currentSong.song.lyrics, [], currentSong.song.title);
      quizQs=[];

      lyrics.forEach((line,index)=>{
        const english=String(line.en || '').trim();
        if(!english) return;

        const words=english.split(/\s+/);
        if(words.length>=3){
          const blankIndex=Math.floor(Math.random()*(words.length-1))+1;
          const answer=words[blankIndex].replace(/[^a-zA-Z']/g,'');
          if(answer.length>=2){
            const blank=[...words];
            blank[blankIndex]='_____';
            quizQs.push({
              q:`Complete a letra:\n"${blank.join(' ')}"`,
              correct:answer,
              choices:genWrongChoices(answer)
            });
          }
        }

        if(index%2===0 && line.pt){
          quizQs.push({
            q:`Traduza para português:\n"${english.substring(0,55)}${english.length>55?'...':''}"`,
            correct:line.pt,
            choices:genTransChoices(line.pt,lyrics,index)
          });
        }
      });

      quizQs=shuffleArray(quizQs).slice(0,5);
      if(!quizQs.length){
        showToast('Não há linhas suficientes para montar quiz desta música.','info');
        return;
      }

      quizCurrent=0;
      quizCorrect=0;
      setVisible('quizOverlay', true);
      renderQuizQ();
    }

    function genWrongChoices(correct){
      const words=['love','night','heart','time','world','eyes','feel','know','life','way','stay','call'];
      const choices=[correct];
      while(choices.length<4){
        const item=words[Math.floor(Math.random()*words.length)];
        if(!choices.includes(item)) choices.push(item);
      }
      return shuffleArray(choices);
    }

    function genTransChoices(correct,lyrics,skip){
      const choices=[correct];
      const others=safeLyrics(lyrics)
        .filter((line,index)=>index!==skip && line?.pt)
        .map(line=>line.pt);
      shuffleArray(others).slice(0,3).forEach(option=>{
        if(option && !choices.includes(option)) choices.push(option);
      });
      while(choices.length<4) choices.push(`Outra opção ${choices.length}`);
      return shuffleArray(choices);
    }

    function renderQuizQ(){
      if(quizCurrent>=quizQs.length){
        closeQuizResult();
        return;
      }

      const question=quizQs[quizCurrent];
      const percent=(quizCurrent/quizQs.length)*100;
      setWidth('quizBar', `${percent}%`);
      const count=$('quizCount');
      const quizQ=$('quizQ');
      const choices=$('quizChoices');
      if(count) count.textContent=`${quizCurrent+1}/${quizQs.length}`;
      if(quizQ) quizQ.textContent=question.q;
      setVisible('quizFeedback', false);
      setVisible('quizNextBtn', false);
      quizAnswered=false;
      if(!choices) return;

      choices.innerHTML='';
      question.choices.forEach(choice=>{
        const btn=document.createElement('button');
        btn.className='quiz-choice';
        btn.textContent=choice;
        btn.addEventListener('click',()=>{
          if(!quizAnswered) selectQuizA(choice,question);
        });
        choices.appendChild(btn);
      });
    }

    function selectQuizA(answer,question){
      quizAnswered=true;
      const isCorrect=answer.toLowerCase().trim()===question.correct.toLowerCase().trim();
      if(isCorrect) quizCorrect++;

      document.querySelectorAll('.quiz-choice').forEach(btn=>{
        btn.style.pointerEvents='none';
        if(btn.textContent.toLowerCase().trim()===question.correct.toLowerCase().trim()) btn.classList.add('correct');
        else if(btn.textContent===answer && !isCorrect) btn.classList.add('wrong');
      });

      const feedback=$('quizFeedback');
      setVisible('quizFeedback', true);
      if(feedback){
        if(isCorrect){
          feedback.style.background='rgba(0,255,136,.1)';
          feedback.style.color='var(--green)';
          feedback.textContent=['🎉 Incrível!','✨ Certo!','🔥 Mandou!','💪 Isso!'][Math.floor(Math.random()*4)];
          floatXP('+10 XP');
        }else{
          feedback.style.background='rgba(255,45,120,.1)';
          feedback.style.color='var(--pink)';
          feedback.textContent=`❌ Correto: "${question.correct}"`;
        }
      }
      setVisible('quizNextBtn', true);
    }

    function nextQuizQ(){
      quizCurrent++;
      renderQuizQ();
    }

    function closeQuizResult(){
      const xpGained=quizCorrect*10;
      state.xp=(Number(state.xp) || 0)+xpGained;
      updateUI();
      saveState();
      setVisible('quizOverlay', false);
      showToast(`🎵 Quiz: ${quizCorrect}/${quizQs.length} corretas! +${xpGained} XP`,'success');
    }

    function closeQuiz(){
      setVisible('quizOverlay', false);
    }

    return {
      switchMusicTab,
      renderSuggestions,
      loadSuggestion,
      loadFromYouTube,
      openMusicPlayer,
      closeMusicPlayer,
      startKaraokeFromPlayer,
      updateLyricsTranslations,
      renderLyrics,
      toggleLyricDetail,
      setLyricMode,
      toggleFavorite,
      updateFavBtn,
      renderFavorites,
      removeFav,
      startMusicQuiz,
      nextQuizQ,
      closeQuizResult,
      closeQuiz
    };
  }

  window.LinguaFireMusicPlayer={createController};
})();
