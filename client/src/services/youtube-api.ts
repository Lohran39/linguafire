// One loader shared by all mounts. A blocked API must not hide the plain iframe.
let pending: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (pending) return pending;
  pending = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const script = existing || document.createElement('script');
    function finish(error?: Error) {
      window.clearTimeout(timer);
      script.removeEventListener('error', failed);
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
      if (error) { script.remove(); reject(error); }
      else resolve();
    }
    function ready() { try { previous?.(); } finally { finish(); } }
    function failed() { finish(new Error('YouTube timing API unavailable')); }
    const timer = window.setTimeout(failed, 12000);
    window.onYouTubeIframeAPIReady = ready;
    script.addEventListener('error', failed, { once: true });
    if (!existing) {
      script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
      document.body.appendChild(script);
    }
  }).finally(() => { pending = null; });
  return pending;
}
