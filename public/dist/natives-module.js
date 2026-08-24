// ==================== NATIVOS ====================
(function initNativesModule(window){
  const SUGGESTIONS=['look forward to','give up','break down','make up your mind','nevertheless','take for granted','turn out','go ahead','come up with','on the other hand','work out','figure out'];
  const LANG_SUFFIX={'english':'english','english-us':'american english','english-uk':'british english','english-au':'australian english','spanish':'español','french':'français','german':'deutsch','italian':'italiano','portuguese':'português'};
  const STOPWORDS=new Set(['a','an','and','are','as','at','be','but','by','for','from','in','into','is','it','me','my','of','on','or','our','that','the','their','them','there','they','this','to','us','we','with','you','your']);

  function buildShortsFallbackUrl(query, lang){
    const langLabel=LANG_SUFFIX[lang] || 'english';
    const searchQuery=`"${query}" ${langLabel} shorts native speaker -lyrics -song`;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&sp=EgIYAQ%253D%253D`;
  }

  function buildRetryVariants(query){
    const cleaned=String(query || '').trim().replace(/\s+/g,' ');
    if(!cleaned) return [];

    const variants=[{label:'Frase exata',value:cleaned}];
    const words=cleaned.split(' ').filter(Boolean);
    const significantWords=words.filter(word=>!STOPWORDS.has(word.toLowerCase()));

    if(significantWords.length>=2){
      variants.push({
        label:'Expressão reduzida',
        value:significantWords.slice(0,3).join(' ')
      });
    }

    const keyword=[...significantWords,...words].sort((a,b)=>b.length-a.length)[0];
    if(keyword && !variants.some(item=>item.value.toLowerCase()===keyword.toLowerCase())){
      variants.push({
        label:'Palavra principal',
        value:keyword
      });
    }

    return variants.slice(0,3);
  }

  function createController({ $, createEl, setVisible, showToast }){
    function renderFallback(container, query, lang, message, providerDown=false, searchUrl=''){
      const variants=buildRetryVariants(query);
      const subtitle=providerDown
        ? 'A busca externa falhou. Continue aqui mesmo refinando a frase dentro da plataforma.'
        : 'A busca agora exige frase exata, vídeo curto e contexto de fala real. Refine a frase sem sair do app.';

      container.textContent='';
      const box=createEl('div','natives-native-fallback','');
      const badge=createEl('span','natives-native-badge','Modo nativo');
      const title=createEl('h4','', 'Refine a busca aqui dentro');
      const messageEl=createEl('p','',message || 'Nenhum vídeo encontrado.');
      const subtitleEl=createEl('p','natives-native-subtitle',subtitle);
      const queryEl=createEl('div','natives-native-query',`"${query}"`);
      const actions=createEl('div','natives-native-actions','');

      variants.forEach((variant)=>{
        const btn=createEl('button','natives-retry-btn','');
        btn.type='button';
        btn.dataset.query=variant.value;
        btn.dataset.lang=lang;
        btn.append(`${variant.label}: `,createEl('strong','',variant.value));
        actions.appendChild(btn);
      });

      if(searchUrl){
        const link=createEl('a','natives-fallback-link','Abrir busca exata no YouTube Shorts');
        link.href=searchUrl;
        link.target='_blank';
        link.rel='noopener noreferrer';
        actions.appendChild(link);
      }

      box.append(badge,title,messageEl,subtitleEl,queryEl,actions);
      container.appendChild(box);
    }

    async function doSearch(query, lang){
      const container=$('yg-widget');
      container.innerHTML='<div class="natives-loading"><span>🔍 Buscando shorts com frase exata...</span></div>';

      try{
        const params=new URLSearchParams({
          q:query,
          lang,
          strict:'1',
          shorts:'1'
        });
        const response=await fetch(`/api/natives/search?${params.toString()}`);
        const data=await response.json();

        if(!response.ok){
          throw new Error(data?.error || 'Erro ao buscar vídeos');
        }

        const ids=data.videoIds || [];
        if(ids.length===0){
          renderFallback(
            container,
            query,
            lang,
            data?.message || 'Nenhum vídeo encontrado. Tente outra expressão.',
            data?.reason==='providers_unavailable' || /provedores/i.test(data?.message || ''),
            data?.searchUrl || buildShortsFallbackUrl(query, lang)
          );
          return;
        }

        const [first,...rest]=ids;
        container.innerHTML=`
          <iframe id="nativesIframe" width="100%" height="380"
            src="https://www.youtube-nocookie.com/embed/${first}?autoplay=1&rel=0&modestbranding=1"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen style="border-radius:14px;display:block;"></iframe>
          ${rest.length ? `<div class="natives-strip">${rest.map(id=>`<img class="natives-thumb" data-vid="${id}" src="https://img.youtube.com/vi/${id}/mqdefault.jpg" alt="vídeo"/>`).join('')}</div>` : ''}`;
      }catch(error){
        const message=error?.message || 'Erro ao buscar vídeos.';
        renderFallback(container, query, lang, `⚠️ ${message}`, true, buildShortsFallbackUrl(query, lang));
      }
    }

    function initTab(){
      const sugContainer=$('nativesSugTags');
      if(!sugContainer || sugContainer.dataset.init) return;

      sugContainer.dataset.init='1';
      SUGGESTIONS.forEach((word)=>{
        const btn=document.createElement('button');
        btn.className='natives-sug-tag';
        btn.textContent=word;
        btn.type='button';
        btn.addEventListener('click',()=>{
          $('nativesInput').value=word;
          performSearch();
        });
        sugContainer.appendChild(btn);
      });
    }

    function performSearch(){
      const query=$('nativesInput').value.trim();
      if(!query) return showToast('Digite uma palavra ou frase','error');
      const lang=$('nativesLang').value;
      $('nativesResultWord').textContent=`"${query}"`;
      setVisible('nativesSearchArea', false);
      setVisible('nativesResult', true);
      doSearch(query, lang);
    }

    function resetSearch(){
      setVisible('nativesResult', false);
      setVisible('nativesSearchArea', true);
      $('nativesInput').value='';
      $('yg-widget').innerHTML='';
    }

    return {
      doSearch,
      initTab,
      performSearch,
      resetSearch,
      renderFallback
    };
  }

  window.LinguaFireNatives={
    LANG_SUFFIX,
    STOPWORDS,
    SUGGESTIONS,
    buildRetryVariants,
    buildShortsFallbackUrl,
    createController
  };
})(window);
