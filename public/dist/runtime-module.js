(function(){
  const MAX_LIVES = 5;
  const LIVES_REGEN_MS = 30 * 60 * 1000;

  function createController(deps = {}) {
    const {
      state,
      saveState = () => {},
      updateUI = () => {},
      showToast = () => {}
    } = deps;

    let srInstance = null;
    let srActive = false;

    function updateLivesTimer() {
      const timerEl = document.getElementById('livesTimer');
      if (!timerEl || !state) return;

      if (state.lives >= MAX_LIVES) {
        timerEl.textContent = '';
        timerEl.style.display = 'none';
        return;
      }

      const last = state.livesLastRegen || Date.now();
      const nextRegen = last + LIVES_REGEN_MS;
      const remaining = Math.max(0, nextRegen - Date.now());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      timerEl.style.display = 'inline';
    }

    function checkLivesRegen() {
      if (!state) return;

      if (state.lives >= MAX_LIVES) {
        state.livesLastRegen = Date.now();
        return;
      }

      const now = Date.now();
      const last = state.livesLastRegen || now;
      const gained = Math.floor((now - last) / LIVES_REGEN_MS);

      if (gained > 0) {
        const before = state.lives;
        state.lives = Math.min(MAX_LIVES, state.lives + gained);
        state.livesLastRegen = last + gained * LIVES_REGEN_MS;

        if (state.lives > before) {
          saveState(false);
          updateUI();
          showToast(`❤️ +${state.lives - before} vida(s) recuperada(s)!`, 'info');
        }
      }

      updateLivesTimer();
    }

    function initLivesRegen() {
      checkLivesRegen();
      setInterval(() => {
        checkLivesRegen();
        updateLivesTimer();
      }, 30000);
      setInterval(updateLivesTimer, 1000);
    }

    function speakText(text, lang = 'en-US') {
      if (!window.speechSynthesis) {
        console.warn('SpeechSynthesis not supported');
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find((voice) => voice.lang.startsWith('en') && voice.localService);
      if (englishVoice) utterance.voice = englishVoice;

      window.speechSynthesis.speak(utterance);
    }

    function testSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('❌ Reconhecimento de voz não suportado neste browser. Use Chrome ou Edge.', 'error');
        return false;
      }

      showToast('🎤 Mic disponível! Clique em Gravar para testar.', 'success');
      return true;
    }

    function startSpeechRec(onResult, onEnd) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        showToast('❌ Reconhecimento de voz não suportado neste browser. Use Chrome ou Edge.', 'error');
        if (onEnd) onEnd();
        return;
      }

      if (srInstance) {
        srInstance.abort();
        srInstance = null;
      }

      srInstance = new SpeechRecognition();
      srInstance.lang = 'en-US';
      srInstance.continuous = false;
      srInstance.interimResults = false;

      srInstance.onresult = (event) => {
        if (event.results.length > 0 && event.results[0].length > 0 && onResult) {
          onResult(event.results[0][0].transcript);
        }
        srActive = false;
      };

      srInstance.onerror = (event) => {
        let errorMsg = 'Erro no mic.';
        if (event.error === 'not-allowed') {
          errorMsg = '❌ Mic bloqueado. Permita o acesso ao microfone nas configurações do browser.';
        } else if (event.error === 'no-speech') {
          errorMsg = '🎤 Nenhuma voz detectada. Tente novamente!';
        } else if (event.error === 'network') {
          errorMsg = '🌐 Erro de rede. Verifique sua conexão.';
        } else {
          errorMsg = `❌ Erro no mic: ${event.error}. Verifique permissões.`;
        }

        console.error('Speech recognition error:', event.error);
        showToast(errorMsg, 'error');
        srActive = false;
        if (onEnd) onEnd();
      };

      srInstance.onend = () => {
        srActive = false;
        if (onEnd) onEnd();
      };

      try {
        srInstance.start();
        srActive = true;
      } catch (_error) {
        showToast('❌ Não foi possível iniciar o mic. Verifique se está em uso por outro app.', 'error');
        srActive = false;
        if (onEnd) onEnd();
      }
    }

    return {
      checkLivesRegen,
      initLivesRegen,
      speakText,
      startSpeechRec,
      testSpeechRecognition,
      updateLivesTimer
    };
  }

  window.LinguaFireRuntime = { createController };
})();
