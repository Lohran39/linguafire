(function initShopModule(window){
  'use strict';

  const ITEM_DESCRIPTIONS=Object.freeze({
    extra_life:'+1 vida (max 9)',
    free_hint:'Dica gratis na proxima licao',
    xp_booster:'XP em dobro na proxima licao',
    streak_freeze:'Protege streak por 1 dia',
    all_lives:'Restaura vidas ao maximo',
    mystery_box:'Recompensa surpresa'
  });

  function createController(options){
    const {
      $,
      createEl,
      state,
      isLoggedIn,
      getAuthHeaders,
      showToast,
      saveState,
      updateUI
    }=options;

    let shopItems=[];

    function renderEmpty(container, icon, title){
      if(!container) return;
      const empty=createEl('div','empty-state');
      empty.append(
        createEl('div','empty-state-icon',icon),
        createEl('div','empty-state-title',title)
      );
      container.replaceChildren(empty);
    }

    function splitItemName(name=''){
      const parts=String(name).trim().split(/\s+/).filter(Boolean);
      return {
        icon:parts[0] || '🛒',
        title:parts.slice(1).join(' ') || String(name || 'Item')
      };
    }

    function renderShopItem(item){
      const {icon,title}=splitItemName(item.name);
      const card=createEl('div','shop-item');

      const iconEl=createEl('div','shop-item-icon',icon);
      const info=createEl('div','shop-item-info');
      info.append(
        createEl('div','shop-item-name',title),
        createEl('div','shop-item-desc',ITEM_DESCRIPTIONS[item.id] || '')
      );

      const buyWrap=createEl('div','shop-item-action');
      const cost=createEl('div','shop-item-cost',`⚡ ${item.cost} XP`);
      const button=createEl('button','shop-buy','Comprar');
      button.type='button';
      button.dataset.shopId=item.id;
      button.disabled=Number(state.xp || 0)<Number(item.cost || 0);
      buyWrap.append(cost,button);

      card.append(iconEl,info,buyWrap);
      return card;
    }

    async function renderShop(){
      const container=$('shopItemList');
      if(!await isLoggedIn()){
        renderEmpty(container,'🔒','Faça login para acessar a loja');
        return;
      }

      const balance=$('shopXpBalance');
      if(balance) balance.textContent=state.xp || 0;

      try{
        const res=await fetch('/api/shop',{credentials:'include'});
        if(!res.ok) throw new Error('Erro ao carregar loja');

        const data=await res.json();
        shopItems=Array.isArray(data.items) ? data.items : [];

        if(!container) return;
        if(shopItems.length===0){
          renderEmpty(container,'🛒','Nenhum item disponível agora');
          return;
        }

        const fragment=document.createDocumentFragment();
        shopItems.forEach((item)=>fragment.appendChild(renderShopItem(item)));
        container.replaceChildren(fragment);
      }catch(_error){
        renderEmpty(container,'⚠️','Erro ao carregar loja');
      }
    }

    async function buyShopItem(itemId){
      if(!await isLoggedIn()){
        showToast('Faça login para comprar','error');
        return;
      }

      try{
        const res=await fetch('/api/shop/buy',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          credentials:'include',
          body:JSON.stringify({itemId})
        });
        const data=await res.json();

        if(!res.ok){
          showToast(data.error || 'Erro na compra','error');
          return;
        }

        if(data.xp!=null) state.xp=Number(data.xp);
        if(data.lives!=null) state.lives=Number(data.lives);
        if(itemId==='free_hint') state.hasFreeHint=true;
        if(itemId==='xp_booster') state.xpMultiplier=2;

        saveState();
        updateUI();
        renderShop();

        if(itemId==='mystery_box' && data.reward){
          showMysteryBoxReward(data.reward);
          return;
        }

        showToast(`🛒 ${data.message || 'Compra realizada!'}`,'success');
      }catch(_error){
        showToast('Erro ao comprar item','error');
      }
    }

    function showMysteryBoxReward(reward){
      const overlay=createEl('div','mystery-overlay');
      const box=createEl('div','mystery-box');
      box.append(
        createEl('div','mystery-box-icon','🎁'),
        createEl('div','mystery-reward-text',reward.message || 'Recompensa desbloqueada!')
      );

      if(reward.type==='xp') box.appendChild(createEl('div','mystery-xp',`+${reward.amount || 0} XP`));
      if(reward.type==='lives') box.appendChild(createEl('div','mystery-lives',`❤️ x${reward.amount || 0}`));
      if(reward.type==='hint') box.appendChild(createEl('div','mystery-hint',`💡 x${reward.amount || 0}`));
      if(reward.type==='title') box.appendChild(createEl('div','mystery-title','🏆 Caixeiro Voador'));

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      setTimeout(()=>box.classList.add('open'),100);
      overlay.addEventListener('click',()=>{
        overlay.remove();
        showToast(`🎁 ${reward.message || 'Recompensa desbloqueada!'}`,'success');
      });
      setTimeout(()=>overlay.remove(),4000);
    }

    return {
      renderShop,
      buyShopItem,
      showMysteryBoxReward
    };
  }

  window.LinguaFireShop={ITEM_DESCRIPTIONS,createController};
})(window);
