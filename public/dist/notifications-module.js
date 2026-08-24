(function initNotificationsModule(window){
  'use strict';

  const SERVICE_WORKER_PATH='/sw-push.js';
  const REMINDER_KEY='lf_last_reminder';
  const REMINDER_CHECK_MS=60 * 60 * 1000;
  const DAILY_REMINDER_HOUR=18;

  function createController(options){
    const {
      state,
      isLoggedIn,
      getAuthHeaders,
      showToast
    }=options;

    let reminderIntervalId=null;
    let promptTimerId=null;
    let initialized=false;

    function supportsServiceWorker(){
      return 'serviceWorker' in navigator;
    }

    function supportsNotifications(){
      return 'Notification' in window;
    }

    async function registerServiceWorker(){
      if(!supportsServiceWorker()) return null;
      try{
        return await navigator.serviceWorker.register(SERVICE_WORKER_PATH,{scope:'/'});
      }catch(error){
        console.warn('SW Push nao registrado:',error);
        return null;
      }
    }

    async function initPushNotifications(){
      await registerServiceWorker();
      if(!supportsNotifications()) return;

      if(Notification.permission==='granted'){
        scheduleStreakReminder();
      }

      if(!await isLoggedIn()) return;
      if(initialized) return;
      initialized=true;

      try{
        const res=await fetch('/api/push/status',{
          headers:getAuthHeaders(),
          credentials:'include'
        });
        if(!res.ok) return;

        const data=await res.json();
        if(data.subscribed || Notification.permission!=='default') return;

        clearTimeout(promptTimerId);
        promptTimerId=setTimeout(showPushNotificationPrompt,10000);
      }catch(_error){
        // Push e opcional; falhas aqui nao devem travar o app.
      }
    }

    function showPushNotificationPrompt(){
      if(!supportsNotifications() || Notification.permission!=='default') return;

      if(window.confirm('🔔 Ativar notificações para não perder seu streak?')){
        subscribeToPush();
      }
    }

    async function subscribeToPush(){
      if(!supportsServiceWorker() || !supportsNotifications()) return;

      try{
        const keyRes=await fetch('/api/push/public-key',{credentials:'include'});
        const keyData=await keyRes.json();
        if(!keyRes.ok || !keyData.configured || !keyData.publicKey){
          showToast('Push ainda nao configurado no servidor.','error');
          return;
        }

        const permission=await Notification.requestPermission();
        if(permission!=='granted') return;

        const registration=await registerServiceWorker();
        if(!registration) return;

        const subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(keyData.publicKey)
        });

        await fetch('/api/push/subscribe',{
          method:'POST',
          headers:{'Content-Type':'application/json',...getAuthHeaders()},
          credentials:'include',
          body:JSON.stringify(subscription)
        });

        scheduleStreakReminder();
        showToast('🔔 Notificações ativadas!','success');
      }catch(error){
        console.warn('Push subscription failed:',error);
      }
    }

    function handleLessonCompleted(){
      if(!supportsNotifications()) return;
      if(Number(state.totalLessons || 0)!==1 || Notification.permission!=='default') return;

      setTimeout(async ()=>{
        const permission=await Notification.requestPermission();
        if(permission==='granted'){
          showToast('🔔 Notificações ativadas!','success');
          scheduleStreakReminder();
        }
      },2000);
    }

    function scheduleStreakReminder(){
      if(!supportsNotifications() || Notification.permission!=='granted') return;
      if(reminderIntervalId) return;

      const notifyIfNeeded=()=>{
        const today=new Date().toDateString();
        if(localStorage.getItem(REMINDER_KEY)===today) return;

        const now=new Date();
        if(now.getHours()!==DAILY_REMINDER_HOUR || state.lastPlayed===today) return;

        new Notification('🔥 LinguaFire - Não perca sua sequência!',{
          body:`Você está há ${state.streak || 0} dia(s) seguidos. Estude hoje para manter!`,
          icon:'/favicon.svg',
          tag:'streak-reminder'
        });
        localStorage.setItem(REMINDER_KEY,today);
      };

      notifyIfNeeded();
      reminderIntervalId=setInterval(notifyIfNeeded,REMINDER_CHECK_MS);
    }

    function urlBase64ToUint8Array(base64String){
      const padding='='.repeat((4 - base64String.length % 4) % 4);
      const base64=(base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
      const rawData=window.atob(base64);
      const outputArray=new Uint8Array(rawData.length);
      for(let index=0; index<rawData.length; index+=1){
        outputArray[index]=rawData.charCodeAt(index);
      }
      return outputArray;
    }

    return {
      initPushNotifications,
      showPushNotificationPrompt,
      subscribeToPush,
      handleLessonCompleted,
      scheduleStreakReminder,
      urlBase64ToUint8Array
    };
  }

  window.LinguaFireNotifications={
    SERVICE_WORKER_PATH,
    createController
  };
})(window);
