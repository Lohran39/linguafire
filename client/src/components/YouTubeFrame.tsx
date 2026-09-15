import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadYouTubeApi } from '../services/youtube-api';
import { reportMusicVideoStatus } from '../services/lyrics';
import type { Song } from '../data/music';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId?: string;
          host?: string;
          playerVars?: {
            origin?: string;
            enablejsapi?: 1;
            playsinline?: 1;
            rel?: 0;
            modestbranding?: 1;
            start?: number;
          };
          events?: {
            onReady?: (event: { target: { getCurrentTime: () => number } }) => void;
            onError?: (event: { data?: number | string }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => { destroy?: () => void };
      PlayerState?: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function YouTubeFrame({ song, onTimeChange, startSeconds, onVideoChange }: { song: Song; onTimeChange: (seconds: number) => void; startSeconds: number; onVideoChange: (id: string) => void }) {
  const resumeAt = useRef(startSeconds);
  resumeAt.current = startSeconds;
  const frameHost = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [timingUnavailable, setTimingUnavailable] = useState(false);
  const [errorReason, setErrorReason] = useState('');
  const [embedHost, setEmbedHost] = useState<'youtube' | 'nocookie'>('youtube');
  const [reloadToken, setReloadToken] = useState(0);
  const candidateIds = useMemo(() => {
    const ids = [song.ytId, ...(song.videoCandidates || []).map((candidate) => candidate.videoId)];
    return [...new Set(ids.filter(Boolean))];
  }, [song.videoCandidates, song.ytId]);
  const candidatesKey = candidateIds.join(',');
  const [candidateIndex, setCandidateIndex] = useState(0);
  const currentVideoId = candidateIds[candidateIndex] || song.ytId;
  useEffect(() => { onVideoChange(currentVideoId); }, [currentVideoId, onVideoChange]);
  const watchUrl = `https://www.youtube.com/watch?v=${currentVideoId}`;
  const thumbUrl = `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`;
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({
      enablejsapi: '1',
      origin: window.location.origin,
      widget_referrer: window.location.href,
      playsinline: '1',
      rel: '0',
      start: String(Math.max(0, Math.floor(resumeAt.current)))
    });
    const host = embedHost === 'youtube' ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
    return `${host}/embed/${currentVideoId}?${params.toString()}`;
  }, [currentVideoId, embedHost, reloadToken]);
  const playerKey = `${embedHost}:${currentVideoId}:${reloadToken}`;

  const reportCurrentVideo = useCallback((status: 'working' | 'bad', reason?: string) => {
    reportMusicVideoStatus({
      trackKey: song.trackKey,
      track: song.title,
      artist: song.artist,
      videoId: currentVideoId,
      status,
      reason
    });
  }, [currentVideoId, song.artist, song.title, song.trackKey]);

  const failCurrentVideo = useCallback((reason = 'embed_failed') => {
    // Network/API failures do not mean the video itself is unavailable.
    if (['youtube_100', 'youtube_101', 'youtube_150'].includes(reason)) reportCurrentVideo('bad', reason);
    setEmbedLoaded(false);
    setErrorReason(reason);

    if (candidateIndex + 1 < candidateIds.length) {
      setEmbedFailed(false);
      setCandidateIndex((index) => index + 1);
      return;
    }

    setEmbedFailed(true);
  }, [candidateIds.length, candidateIndex, reportCurrentVideo]);

  useEffect(() => {
    setEmbedFailed(false);
    setEmbedLoaded(false);
    setEmbedHost('youtube');
    setCandidateIndex(0);
    onTimeChange(resumeAt.current);
  }, [candidatesKey, onTimeChange, song.ytId]);

  useEffect(() => {
    let intervalId: number | undefined;
    let cancelled = false;
    setTimingUnavailable(false);
    // YT.Player.destroy removes its iframe. Keep that DOM outside React's
    // children so retry, tab changes and StrictMode always get a fresh frame.
    const frame = document.createElement('iframe');
    frame.className = 'youtube-player';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.title = `${song.title} - ${song.artist}`;
    frame.src = embedUrl;
    frame.onload = () => { if (!cancelled) setEmbedLoaded(true); };
    frameHost.current?.replaceChildren(frame);
    iframeRef.current = frame;

    function startPlayer() {
      if (cancelled || !iframeRef.current || !window.YT?.Player) return;
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setEmbedLoaded(true);
            setEmbedFailed(false);
            intervalId = window.setInterval(() => {
              const currentTime = Number(event.target.getCurrentTime?.() || 0);
              if (Number.isFinite(currentTime)) onTimeChange(currentTime);
            }, 600);
          },
          onError: (event) => {
            if (cancelled) return;
            failCurrentVideo(`youtube_${event.data || 'error'}`);
          },
          onStateChange: (event) => {
            if (!cancelled && event.data === 1) reportCurrentVideo('working');
          }
        }
      });
    }

    void loadYouTubeApi().then(() => { if (!cancelled) startPlayer(); }).catch(() => {
      if (!cancelled) { setTimingUnavailable(true); setEmbedLoaded(true); }
    });

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = null;
      frame.remove();
      iframeRef.current = null;
    };
  }, [currentVideoId, failCurrentVideo, onTimeChange, playerKey, reportCurrentVideo]);

  return (<>
    <section className={`video-frame music-embed${embedFailed ? ' has-video-error' : ''}`} aria-label={`Vídeo de ${song.title}`}>
      <div className="youtube-frame-host" ref={frameHost} />
      {!embedLoaded && !embedFailed && (
        <div className="video-loading">
          <img src={thumbUrl} alt="" loading="lazy" />
          <span className="video-play" aria-hidden="true">▶</span>
          <strong>Carregando vídeo...</strong>
        </div>
      )}
      {embedFailed && (
        <div className="video-fallback">
          <img src={thumbUrl} alt="" loading="lazy" />
          <div>
            <strong>{['youtube_100', 'youtube_101', 'youtube_150'].includes(errorReason) ? 'Este vídeo não permite reprodução aqui.' : 'Não foi possível iniciar este vídeo.'}</strong>
            <span>{errorReason === 'youtube_153' ? 'O YouTube não reconheceu a página. Tente novamente ou abra no navegador.' : 'Tente recarregar. Se o bloqueio continuar, abra no YouTube e acompanhe a letra aqui.'}</span>
            <button
              type="button"
              onClick={() => {
                setEmbedLoaded(false);
                setEmbedFailed(false);
                setCandidateIndex(0);
                setEmbedHost((host) => (host === 'youtube' ? 'nocookie' : 'youtube'));
                setReloadToken((token) => token + 1);
              }}
            >
              Tentar carregar aqui
            </button>
            <a href={watchUrl} target="_blank" rel="noreferrer">Abrir no YouTube</a>
          </div>
        </div>
      )}
    </section>
    {timingUnavailable && <p className="music-status" role="status">Toque no vídeo para reproduzir. O destaque automático da letra está indisponível neste navegador.</p>}
  </>);
}

