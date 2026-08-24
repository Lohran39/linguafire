(function initConversationModule(window){
  'use strict';

  const CONVERSATION_HINTS=Object.freeze({
    restaurant:['Peça sua comida favorita','Pergunte sobre o cardápio','Peça a conta'],
    airport:['Faça check-in','Pergunte sobre o portão de embarque','Peça ajuda com a bagagem'],
    job_interview:['Fale sobre sua experiência','Pergunte sobre a empresa','Mostre suas habilidades'],
    small_talk:['Fale sobre seu dia','Comente sobre o clima','Pergunte sobre hobbies'],
    shopping:['Pergunte sobre preços','Busque um tamanho diferente','Peça troco']
  });

  function noop(){}

  function createElement(tag,className,text){
    const element=document.createElement(tag);
    if(className) element.className=className;
    if(text!=null) element.textContent=String(text);
    return element;
  }

  function createController(options={}){
    const getEl=typeof options.$==='function' ? options.$ : (id)=>document.getElementById(id);
    const setVisible=typeof options.setVisible==='function'
      ? options.setVisible
      : (id,visible)=>getEl(id)?.classList.toggle('is-hidden',!visible);
    const state=options.state || {};
    const isLoggedIn=typeof options.isLoggedIn==='function' ? options.isLoggedIn : async()=>false;
    const getAuthHeaders=typeof options.getAuthHeaders==='function' ? options.getAuthHeaders : ()=>({});
    const showToast=typeof options.showToast==='function' ? options.showToast : noop;
    const loadStateFromServer=typeof options.loadStateFromServer==='function' ? options.loadStateFromServer : noop;

    let conversationHistory=[];
    let currentTopic=null;

    function setEmptyState(message,icon='⚠️'){
      const grid=getEl('topicGrid');
      if(!grid) return;
      grid.textContent='';

      const empty=createElement('div','empty-state','');
      empty.append(
        createElement('div','empty-state-icon',icon),
        createElement('div','empty-state-title',message)
      );
      grid.appendChild(empty);
    }

    function getTopicLabel(topic){
      return String(topic?.name || '').split(' ').slice(1).join(' ') || 'Conversation';
    }

    async function loadConversationTopics(){
      const grid=getEl('topicGrid');
      if(!grid) return;

      if(!await isLoggedIn()){
        setEmptyState('Faça login para conversar','🔒');
        return;
      }

      try{
        const response=await fetch('/api/conversation/topics');
        const data=await response.json();
        grid.textContent='';

        (data.topics || []).forEach((topic)=>{
          const card=createElement('button','topic-card','');
          card.type='button';
          const parts=String(topic.name || '').split(' ');
          card.append(
            createElement('div','tc-icon',parts[0] || '💬'),
            createElement('div','tc-name',parts.slice(1).join(' ') || topic.name || 'Conversa'),
            createElement('div','tc-desc','Pratique inglês com IA')
          );
          card.addEventListener('click',()=>startConversation(topic));
          grid.appendChild(card);
        });

        if(!grid.children.length){
          setEmptyState('Nenhum tópico disponível','💬');
        }
      }catch(_error){
        setEmptyState('Erro ao carregar tópicos','⚠️');
      }
    }

    function startConversation(topic){
      currentTopic=topic;
      conversationHistory=[];

      const topics=getEl('topicGrid')?.parentElement;
      if(topics) topics.classList.add('is-hidden');

      setVisible('conversationPanel',true);
      if(getEl('convTopicName')) getEl('convTopicName').textContent=topic.name || 'Conversa';
      if(getEl('convMessages')) getEl('convMessages').textContent='';
      if(getEl('convInput')) getEl('convInput').value='';

      updateConvHint();
      updateAIUsageCounter();
      addConvMessage('bot',`Hi! Welcome to ${getTopicLabel(topic)}. Let's practice! Type something in English and I'll help you.`);
    }

    function addConvMessage(type,text){
      const container=getEl('convMessages');
      if(!container) return;

      const message=createElement('div',`conv-msg ${type}`,text);
      container.appendChild(message);
      container.scrollTop=container.scrollHeight;
    }

    function updateConvHint(){
      const hintEl=getEl('convHint');
      if(!hintEl) return;

      const hints=CONVERSATION_HINTS[currentTopic?.id] || ['Fale sobre qualquer assunto em inglês'];
      const hint=hints[Math.floor(Math.random()*hints.length)];
      hintEl.textContent=`💡 Dica: ${hint}`;
    }

    async function sendConvMessage(){
      const input=getEl('convInput');
      const sendButton=getEl('convSendBtn');
      const messages=getEl('convMessages');
      const message=input?.value.trim() || '';
      if(!message || !currentTopic || !input || !sendButton || !messages) return;

      input.value='';
      addConvMessage('user',message);
      conversationHistory.push({role:'user',content:message});

      sendButton.disabled=true;
      sendButton.textContent='⏳';
      const loading=createElement('div','conv-msg bot','💭 Digitando...');
      messages.appendChild(loading);
      messages.scrollTop=messages.scrollHeight;

      try{
        const response=await fetch('/api/conversation',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          body:JSON.stringify({
            topicId:currentTopic.id,
            message,
            history:conversationHistory
          })
        });
        loading.remove();
        const data=await response.json();

        if(response.status===403 && data.error==='limit_reached'){
          showUpgradeModal();
          addConvMessage('bot','⚠️ Você atingiu seu limite diário de 10 mensagens com IA. Assine o Plano Pro para conversas ilimitadas!');
          return;
        }

        if(!response.ok){
          throw new Error(data.error || 'Erro na conversa');
        }

        addConvMessage('bot',data.reply);
        conversationHistory.push({role:'assistant',content:data.reply});
        updateConvHint();
        state.aiUsesToday=(state.aiUsesToday || 0)+1;
        updateAIUsageCounter();
      }catch(error){
        loading.remove();
        addConvMessage('bot',`⚠️ Erro: ${error.message}`);
      }finally{
        sendButton.disabled=false;
        sendButton.textContent='➤';
        input.focus();
      }
    }

    function updateAIUsageCounter(){
      const counter=getEl('convAiCounter');
      if(!counter) return;

      const used=state.aiUsesToday || 0;
      const limit=10;
      const remaining=Math.max(0,limit-used);

      if(state.subscriptionActive){
        counter.textContent='∞ Conversas com IA';
        counter.classList.remove('warning');
        return;
      }

      if(remaining<=3){
        counter.textContent=`⚠️ ${remaining}/${limit} usos de IA hoje`;
        counter.classList.add('warning');
        return;
      }

      counter.textContent=`${remaining}/${limit} usos de IA hoje`;
      counter.classList.remove('warning');
    }

    function showUpgradeModal(){
      getEl('upgradeModal')?.classList.remove('is-hidden');
    }

    function hideUpgradeModal(){
      getEl('upgradeModal')?.classList.add('is-hidden');
    }

    async function subscribePro(){
      try{
        const response=await fetch('/api/subscription/create',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          body:JSON.stringify({plan:'monthly'})
        });
        const data=await response.json();

        if(data.success){
          state.subscriptionActive=true;
          state.subscriptionExpires=data.subscription.expires;
          hideUpgradeModal();
          showToast('🎉 Assinatura Pro ativada! Aproveite conversas ilimitadas!','success');
          updateAIUsageCounter();
          loadStateFromServer();
          return;
        }

        showToast(`Erro ao ativar: ${data.error || 'Tente novamente'}`,'error');
      }catch(_error){
        showToast('Erro ao ativar assinatura','error');
      }
    }

    function closeConversation(){
      if(conversationHistory.length>2){
        analyzeGrammarAfterConversation();
      }

      setVisible('conversationPanel',false);
      const topics=getEl('topicGrid')?.parentElement;
      if(topics) topics.classList.remove('is-hidden');
      currentTopic=null;
      conversationHistory=[];
    }

    async function analyzeGrammarAfterConversation(){
      try{
        const response=await fetch('/api/grammar/analyze',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          body:JSON.stringify({
            conversationHistory:conversationHistory.slice(-10),
            topicId:currentTopic?.id
          })
        });
        const data=await response.json();
        if(data.errors && data.errors.length>0){
          showToast(`📝 Análise: ${data.errors.length} erro(s) gramatical(is) encontrado(s)!`,'info');
        }
      }catch(_error){}
    }

    return {
      loadConversationTopics,
      startConversation,
      addConvMessage,
      updateConvHint,
      sendConvMessage,
      updateAIUsageCounter,
      showUpgradeModal,
      hideUpgradeModal,
      subscribePro,
      closeConversation,
      analyzeGrammarAfterConversation
    };
  }

  window.LinguaFireConversation={
    CONVERSATION_HINTS,
    createController
  };
})(window);
