import { ContentReview } from './ContentReview';
import { contentKey, getCurations, isVerified, type CurationItem } from '../services/curation';
import { recordLearning } from '../services/learning';
import { useActivityState } from '../hooks/activity-progress';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findSong, getSongByKey, SONGS, SUGGESTIONS, type LyricLine, type Song } from '../data/music';
import { englishLevelDistance, normalizeEnglishLevel } from '../data/levels';
import { updateProfile, type FavoriteSong, type UserProfile } from '../services/auth';
import { extractYouTubeId, fetchSongLyrics, fetchYouTubeMetadata, parseYouTubeMusicMetadata, reportMusicVideoStatus, searchMusicByName, translateLyricLines } from '../services/lyrics';

type MusicTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

type QuizQuestion = {
  line: LyricLine;
  choices: string[];
  correct: string;
  prompt: string;
};

function lyricTranslation(line: LyricLine) {
  if (line.translationStatus === 'pending') return 'Traduzindo...';
  if (line.translationStatus === 'unavailable') return 'Tradução indisponível.';
  return line.pt;
}

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

const MUSIC_FILTERS = [
  { key: 'recommended', label: 'Meu nível' },
  { key: 'slow', label: 'Mais claras' },
  { key: 'pop', label: 'Pop' },
  { key: 'conversation', label: 'Conversa' },
  { key: 'past', label: 'Passado' }
] as const;

const MAX_VISIBLE_SUGGESTIONS = 5;

type MusicFilter = (typeof MUSIC_FILTERS)[number]['key'];

function toFavorite(song: Song): FavoriteSong {
  return {
    key: song.key,
    title: song.title,
    artist: song.artist,
    ytId: song.ytId,
    level: song.level
  };
}

function shuffleItems<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function createQuiz(song: Song): QuizQuestion[] {
  const usableLines = shuffleItems(song.lyrics.filter((line) => line.en && line.pt && (!line.translationStatus || line.translationStatus === 'ready')));

  return usableLines
    .filter((line) => line.en && line.pt)
    .slice(0, 5)
    .map((line, index) => {
      const wrongChoices = shuffleItems(usableLines)
        .filter((candidate) => candidate.pt !== line.pt)
        .map((candidate) => candidate.pt)
        .slice(0, 3);
      const fallbackChoices = [
        'Essa frase fala sobre rotina.',
        'Essa frase fala sobre sentimento.',
        'Essa frase fala sobre decisão.'
      ].filter((choice) => choice !== line.pt);
      const choices = shuffleItems([line.pt, ...wrongChoices, ...fallbackChoices].slice(0, 4));
      const prompt = index % 2 === 0 ? 'Qual é a melhor tradução?' : 'Escolha o sentido mais natural da frase.';
      return { line, choices, correct: line.pt, prompt };
    });
}

function songLevelToEnglishLevel(level: string) {
  const normalized = level.toLowerCase();
  if (normalized.includes('iniciante')) return 'A1';
  if (normalized.includes('intermedi')) return 'B1';
  if (normalized.includes('avanc')) return 'C1';
  return 'A2';
}

function sortSongsForLevel(songs: Song[], userLevel: string) {
  return [...songs].sort((a, b) => {
    const aLevel = songLevelToEnglishLevel(a.level);
    const bLevel = songLevelToEnglishLevel(b.level);
    return englishLevelDistance(aLevel, userLevel) - englishLevelDistance(bLevel, userLevel);
  });
}

function formatMusicTime(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return '';
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}

function YouTubeFrame({ song, onTimeChange, startSeconds, onVideoChange }: { song: Song; onTimeChange: (seconds: number) => void; startSeconds: number; onVideoChange: (id: string) => void }) {
  const resumeAt = useRef(startSeconds);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
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

    if (window.YT?.Player) {
      startPlayer();
    } else {
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        startPlayer();
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.onerror = () => {
          script.remove();
          // The plain iframe remains usable when Safari or an in-app browser
          // blocks the optional JavaScript API used to sync lyric timing.
        };
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = null;
    };
  }, [currentVideoId, failCurrentVideo, onTimeChange, playerKey, reportCurrentVideo]);

  return (
    <section className={`video-frame music-embed${embedFailed ? ' has-video-error' : ''}`} aria-label={`Vídeo de ${song.title}`}>
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="youtube-player"
        key={playerKey}
        onLoad={() => setEmbedLoaded(true)}
        ref={iframeRef}
        referrerPolicy="strict-origin-when-cross-origin"
        src={embedUrl}
        title={`${song.title} - ${song.artist}`}
      />
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
            <strong>Não consegui carregar o player agora.</strong>
            <span>Tente novamente. Se abriu pelo WhatsApp, tente abrir esta página no Safari ou Chrome.</span>
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
  );
}

export function MusicTab({ user, onProfileRefresh }: MusicTabProps) {
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const [query, setQuery] = useActivityState('music', 'query', '');
  const [musicFilter, setMusicFilter] = useActivityState<MusicFilter>('music', 'musicFilter', 'recommended');
  const [curations, setCurations] = useState<CurationItem[]>([]);
  const [curationUnavailable, setCurationUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    getCurations('music').then(items => { if (active) setCurations(items); }).catch(() => { if (active) setCurationUnavailable(true); });
    return () => { active = false; };
  }, []);
  const suggestedSongs = useMemo(() => {
    const candidates = (SUGGESTIONS as Song[]).flatMap(song => {
      const records = curations.filter(item => item.content_key === contentKey({ kind: 'music', title: song.title, artist: song.artist }));
      const verified = records.find(isVerified);
      if (!verified && records.some(item => item.video_id === song.ytId && item.status === 'rejected')) return [];
      return [{ ...song, ytId: verified?.video_id || song.ytId }];
    });
    const verifiedSong = (song: Song) => curations.some(item => item.content_key === contentKey({ kind: 'music', title: song.title, artist: song.artist }) && item.video_id === song.ytId && isVerified(item));
    const sorted = sortSongsForLevel(candidates, englishLevel).sort((a, b) => Number(verifiedSong(b)) - Number(verifiedSong(a)));
    if (musicFilter === 'recommended') return sorted;
    return sorted.filter((song) => song.tags.includes(musicFilter));
  }, [englishLevel, musicFilter, curations]);
  const visibleSongs = suggestedSongs;
  const displayedSongs = visibleSongs.slice(0, MAX_VISIBLE_SUGGESTIONS);
  const [activeSong, setActiveSong] = useActivityState<Song>('music', 'activeSong', visibleSongs[0] || SONGS[0]);
  const [playbackVideoId, setPlaybackVideoId] = useState(activeSong.ytId);
  const contentIdentity = { kind: 'music' as const, title: activeSong.title, artist: activeSong.artist, videoId: playbackVideoId };
  const activeCuration = curations.find(item => item.content_key === contentKey(contentIdentity) && item.video_id === playbackVideoId);
  const readyTranslations = activeSong.lyrics.filter(line => line.pt && (!line.translationStatus || line.translationStatus === 'ready')).length;
  const translationLabel = !activeSong.lyrics.length ? 'Tradução ainda não carregada' : readyTranslations === activeSong.lyrics.length ? 'Tradução disponível' : readyTranslations ? 'Tradução parcial' : 'Tradução indisponível';
  const [lyricMode, setLyricMode] = useActivityState<'both' | 'en' | 'pt'>('music', 'lyricMode', 'both');
  const [expandedLine, setExpandedLine] = useActivityState<number | null>('music', 'expandedLine', 0);
  const [notice, setNotice] = useState('');
  const [searchFailed, setSearchFailed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lyricsStatus, setLyricsStatus] = useState<'idle' | 'loading' | 'translating' | 'ready' | 'partial' | 'error'>('idle');
  const [lyricsError, setLyricsError] = useState('');
  const [lyricsRetry, setLyricsRetry] = useState(0);
  const searchRequest = useRef<AbortController | null>(null);
  const lyricsRequest = useRef<AbortController | null>(null);
  const lyricsSource = useRef<{ videoTitle?: string; channelName?: string } | undefined>(undefined);
  const loadedSongs = useRef(new Map<string, Song>());
  const isLoadingLyrics = lyricsStatus === 'loading' || lyricsStatus === 'translating';
  const [quiz, setQuiz] = useActivityState<QuizQuestion[]>('music', 'quiz', []);
  const [learningRun, setLearningRun] = useActivityState('music', 'learningRun', () => crypto.randomUUID());
  const [quizIndex, setQuizIndex] = useActivityState('music', 'quizIndex', 0);
  const [quizAnswer, setQuizAnswer] = useActivityState('music', 'quizAnswer', '');
  const [quizCorrect, setQuizCorrect] = useActivityState('music', 'quizCorrect', 0);
  const [quizRewarded, setQuizRewarded] = useActivityState('music', 'quizRewarded', false);
  const [playerSeconds, setPlayerSeconds] = useActivityState('music', 'playerSeconds', 0);
  const [lyricOffsets, setLyricOffsets] = useActivityState<Record<string, number>>('music', 'lyricOffsets', {});
  const [lyricPause, setLyricPause] = useState<{ songKey: string; videoId: string; seconds: number } | null>(null);
  useEffect(() => { setLyricPause(null); }, [activeSong.key, playbackVideoId]);

  const quizDialogRef = useRef<HTMLDivElement | null>(null);
  const quizVisible = quiz.length > 0;
  useEffect(() => {
    if (!quizVisible) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = quizDialogRef.current;
    dialog?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeQuiz(); return; }
      if (event.key !== 'Tab' || !dialog) return;
      const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    dialog?.addEventListener('keydown', trap);
    return () => { dialog?.removeEventListener('keydown', trap); previousFocus?.focus(); };
  }, [quizVisible]);

  const favorites = useMemo(() => user.favorites || [], [user.favorites]);
  const isFavorite = favorites.some((favorite) => favorite.key === activeSong.key || favorite.ytId === activeSong.ytId);
  const currentQuestion = quiz[quizIndex] || null;
  const quizDone = quiz.length > 0 && quizIndex >= quiz.length;
  const quizXp = quizCorrect * 10 + (quiz.length > 0 && quizCorrect === quiz.length ? 25 : 0);
  const syncedLyrics = activeSong.lyrics.filter((line) => line.time !== undefined);
  const lyricOffset = Number.isFinite(lyricOffsets[playbackVideoId]) ? lyricOffsets[playbackVideoId] : 0;
  const pausedLyrics = lyricPause?.songKey === activeSong.key && lyricPause.videoId === playbackVideoId ? lyricPause : null;
  const lyricSeconds = pausedLyrics ? pausedLyrics.seconds : playerSeconds - lyricOffset;
  const activeLyricIndex = syncedLyrics.reduce((activeIndex, line, index) => {
    return Number(line.time) <= lyricSeconds ? index : activeIndex;
  }, -1);
  const activeKaraokeLine = syncedLyrics[activeLyricIndex] || null;
  const nextKaraokeLine = syncedLyrics[activeLyricIndex + 1] || null;
  function adjustLyrics(offset: number) {
    if (!playbackVideoId || !Number.isFinite(offset)) return;
    setLyricPause(null);
    setLyricOffsets(current => ({ ...current, [playbackVideoId]: Math.round(offset * 10) / 10 }));
  }
  function toggleLyricsPause() {
    if (pausedLyrics) {
      adjustLyrics(playerSeconds - pausedLyrics.seconds);
    } else {
      setLyricPause({ songKey: activeSong.key, videoId: playbackVideoId, seconds: lyricSeconds });
    }
  }

  useEffect(() => {
    if (activeSong.tags.includes('custom') || activeSong.tags.includes('favorite')) return;
    if (!visibleSongs.some((song) => song.key === activeSong.key)) {
      openSong(visibleSongs[0] || SONGS[0]);
    }
  }, [activeSong.key, visibleSongs]);

  useEffect(() => {
    const song = activeSong;
    const hasFetchedLyrics = song.lyricsVersion === 2;
    if (hasFetchedLyrics && song.lyrics.length && song.lyrics.every(line => !line.translationStatus || line.translationStatus === 'ready')) {
      setLyricsStatus('ready');
      return;
    }
    const controller = new AbortController();
    lyricsRequest.current = controller;
    setLyricsError('');
    setLyricsStatus(hasFetchedLyrics && song.lyrics.length ? 'translating' : 'loading');
    const options = {
      signal: controller.signal,
      onProgress: (lyrics: LyricLine[]) => {
        if (controller.signal.aborted) return;
        setActiveSong(current => current.key === song.key ? { ...current, lyrics, lyricsVersion: 2 } : current);
        setLyricsStatus('translating');
      }
    };
    const result = hasFetchedLyrics && song.lyrics.length
      ? translateLyricLines(song.lyrics, options)
      : fetchSongLyrics(song.title, song.artist, undefined, lyricsSource.current, options);
    void result.then(lyrics => {
      if (controller.signal.aborted) return;
      const partial = lyrics.some(line => line.translationStatus === 'unavailable');
      const hydrated = { ...song, lyrics, lyricsVersion: 2 };
      setActiveSong(current => current.key === song.key ? hydrated : current);
      setLyricsStatus(partial ? 'partial' : 'ready');
      if (!partial) {
        if (loadedSongs.current.size >= 20) loadedSongs.current.delete(loadedSongs.current.keys().next().value!);
        loadedSongs.current.set(song.key, hydrated);
      }
    }).catch(error => {
      if (controller.signal.aborted) return;
      setLyricsStatus('error');
      setLyricsError((error instanceof Error ? error.message : 'Não foi possível carregar a letra.') + (!hasFetchedLyrics && song.lyrics.length ? ' Os trechos de estudo abaixo não são a letra completa.' : ''));
    });
    return () => controller.abort();
  }, [activeSong.key, lyricsRetry]);

  useEffect(() => () => {
    searchRequest.current?.abort();
    lyricsRequest.current?.abort();
  }, []);

  useEffect(() => {
    if (!quizDone || quizRewarded) return;

    const nextUser = {
      ...user,
      xp: Number(user.xp || 0) + quizXp,
      correct_answers: Number(user.correct_answers || 0) + quizCorrect
    };

    setQuizRewarded(true);
    updateProfile({ xp_base: Number(user.xp || 0), xp: nextUser.xp, correct_answers: nextUser.correct_answers })
      .then(() => {
        onProfileRefresh(nextUser);
      })
      .catch(() => {
        setNotice('Quiz concluído, mas não consegui salvar o XP agora.');
      });
  }, [onProfileRefresh, quizCorrect, quizDone, quizRewarded, quizXp, user]);

  function openSong(song: Song, source?: { videoTitle?: string; channelName?: string }) {
    searchRequest.current?.abort();
    searchRequest.current = null;
    setIsSearching(false);
    setSearchFailed(false);
    setNotice('');
    if (song.key === activeSong.key) return;
    lyricsRequest.current?.abort();
    lyricsSource.current = source;
    const selectedSong = loadedSongs.current.get(song.key) || song;
    setActiveSong(selectedSong);
    setLyricsError('');
    setLyricsStatus(selectedSong.lyricsVersion === 2 && selectedSong.lyrics.length ? 'ready' : 'loading');
    setExpandedLine(0);
    setPlayerSeconds(0);
    closeQuiz();
  }

  async function handleSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    const youtubeId = extractYouTubeId(trimmedQuery);
    const song = findSong(trimmedQuery);

    if (song) {
      openSong(song as Song);
      return;
    }

    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    try {
      setIsSearching(true);
      setSearchFailed(false);
      setNotice(youtubeId ? 'Lendo dados do YouTube...' : 'Buscando música no YouTube...');
      const foundMusic = youtubeId ? null : await searchMusicByName(trimmedQuery, controller.signal);
      const metadata = youtubeId ? await fetchYouTubeMetadata(youtubeId, controller.signal) : null;
      if (controller.signal.aborted) return;
      const parsedMetadata = youtubeId && metadata
        ? parseYouTubeMusicMetadata(metadata)
        : {
            title: foundMusic?.title || trimmedQuery,
            artist: foundMusic?.artist || 'YouTube',
            videoTitle: foundMusic?.videoTitle || trimmedQuery,
            channelName: foundMusic?.channelName || 'YouTube'
          };
      const finalYoutubeId = youtubeId || foundMusic?.videoId || '';
      if (!finalYoutubeId) {
        throw new Error('Não encontrei vídeo para essa música.');
      }
      const youtubeSong: Song = {
        key: `youtube-${finalYoutubeId}`,
        title: parsedMetadata.title,
        artist: parsedMetadata.artist,
        ytId: finalYoutubeId,
        trackKey: foundMusic?.trackKey,
        videoCandidates: foundMusic?.candidates || [],
        level: 'Livre',
        thumb: 'YouTube',
        focus: youtubeId ? 'Música enviada pelo usuário' : 'Resultado encontrado pelo nome',
        tags: ['custom'],
        lyrics: []
      };
      openSong(youtubeSong, {
        videoTitle: parsedMetadata.videoTitle,
        channelName: parsedMetadata.channelName
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearchFailed(true);
      setNotice(error instanceof Error ? error.message : 'Não consegui abrir esse link.');
    } finally {
      if (searchRequest.current === controller) {
        searchRequest.current = null;
        setIsSearching(false);
      }
    }
  }

  async function toggleFavorite() {
    const nextFavorites = isFavorite
      ? favorites.filter((favorite) => favorite.key !== activeSong.key && favorite.ytId !== activeSong.ytId)
      : [...favorites, toFavorite(activeSong)];

    await updateProfile({ favorites: nextFavorites });
    onProfileRefresh({ ...user, favorites: nextFavorites });
    setNotice(isFavorite ? 'Música removida dos favoritos.' : 'Música salva nos favoritos.');
  }

  function openFavorite(favorite: FavoriteSong) {
    const song = getSongByKey(favorite.key);
    if (song) {
      openSong(song as Song);
      return;
    }

    openSong({
      key: favorite.key,
      title: favorite.title,
      artist: favorite.artist,
      ytId: favorite.ytId,
      level: favorite.level || 'Livre',
      thumb: 'Favorita',
      focus: 'Música salva para revisão',
      tags: ['favorite'],
      lyrics: []
    });
  }

  function startQuiz() {
    const questions = createQuiz(activeSong);
    if (!questions.length) {
      setNotice('Esta música ainda não tem linhas suficientes para quiz no React.');
      return;
    }

    setLearningRun(crypto.randomUUID());
    setQuiz(questions);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizCorrect(0);
    setQuizRewarded(false);
    setNotice('');
  }

  function answerQuiz(choice: string) {
    if (!currentQuestion || quizAnswer) return;
    recordLearning(user.id, 'music_quiz', choice === currentQuestion.correct ? 100 : 0, `${learningRun}:${quizIndex}`);
    setQuizAnswer(choice);
    if (choice === currentQuestion.correct) {
      setQuizCorrect((value) => value + 1);
    }
  }

  function nextQuiz() {
    setQuizAnswer('');
    setQuizIndex((value) => value + 1);
  }

  function closeQuiz() {
    setQuiz([]);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizCorrect(0);
    setQuizRewarded(false);
  }

  return (
    <section className="music-layout" aria-label="Música">
      <div className="music-sidebar">
        <section className="side-panel">
          <div className="panel-heading">
            <h2>Buscar música</h2>
            <span>{displayedSongs.length} sugestões</span>
          </div>
          <div className="search-row">
            <input
              className="field"
              placeholder="Ex: stay, adele ou link do YouTube"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearch();
              }}
            />
            <button className="primary-button" type="button" disabled={isSearching} onClick={handleSearch}>
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {notice && <div className={searchFailed ? 'form-error' : 'music-status'} role="status">{notice}</div>}
        </section>

        <section className="side-panel">
          <div className="panel-heading">
            <h2>Sugestões</h2>
            <span>{englishLevel}</span>
          </div>
          <div className="music-filter-row" aria-label="Filtros de música">
            {MUSIC_FILTERS.map((filter) => (
              <button
                className={musicFilter === filter.key ? 'active' : ''}
                key={filter.key}
                type="button"
                onClick={() => setMusicFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="song-list">
            {displayedSongs.map((song) => (
              <button
                className={activeSong.key === song.key ? 'song-row active' : 'song-row'}
                key={song.key}
                type="button"
                onClick={() => openSong(song as Song)}
              >
                <span className="song-artwork" aria-hidden="true"><img src={`https://i.ytimg.com/vi/${song.ytId}/mqdefault.jpg`} alt="" loading="lazy" width="64" height="64" onError={event => { event.currentTarget.style.display = 'none'; }} /></span>
                <strong>{song.title}</strong>
                <small>{song.artist} · {song.focus}</small>
                {curations.some(item => item.content_key === contentKey({ kind: 'music', title: song.title, artist: song.artist }) && item.video_id === song.ytId && isVerified(item)) && <small className="verified-badge">Verificado</small>}
              </button>
            ))}
          </div>
        </section>

        <section className="side-panel">
          <div className="panel-heading">
            <h2>Favoritas</h2>
            <span>{favorites.length}</span>
          </div>
          {favorites.length === 0 ? (
            <p>Salve uma música para revisar depois.</p>
          ) : (
            <div className="song-list">
              {favorites.map((favorite) => (
                <button className="song-row" key={favorite.key} type="button" onClick={() => openFavorite(favorite)}>
                  <span>Salva</span>
                  <strong>{favorite.title}</strong>
                  <small>{favorite.artist}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="music-player-panel">
        <header className="music-header">
          <div>
            <p className="kicker">{activeSong.level}</p>
            <h1>{activeSong.title}</h1>
            <p className="lead">{activeSong.artist}</p>
            <p className="music-focus">{activeSong.focus}</p>
          </div>
          <div className="music-actions">
            <button className="secondary-button" type="button" onClick={toggleFavorite}>
              {isFavorite ? 'Remover favorito' : 'Favoritar'}
            </button>
            <button className="secondary-button" type="button" disabled={isLoadingLyrics || lyricsStatus === 'ready'} onClick={() => setLyricsRetry(value => value + 1)}>
              {lyricsStatus === 'translating' ? 'Traduzindo...' : isLoadingLyrics ? 'Carregando...' : lyricsStatus === 'partial' ? 'Tentar tradução novamente' : 'Carregar letra'}
            </button>
            <button className="primary-button" type="button" disabled={!activeSong.lyrics.some(line => line.pt && (!line.translationStatus || line.translationStatus === 'ready'))} onClick={startQuiz}>
              Quiz
            </button>
          </div>
        </header>

        <YouTubeFrame key={activeSong.key} song={activeSong} onTimeChange={setPlayerSeconds} startSeconds={playerSeconds} onVideoChange={setPlaybackVideoId} />
        <ContentReview key={`${activeSong.key}:${playbackVideoId}`} content={contentIdentity} item={activeCuration} translation={translationLabel} unavailable={curationUnavailable} />

        {syncedLyrics.length > 0 && (
          <details className="lyrics-sync-controls" key={`sync-${playbackVideoId}`}>
            <summary>Ajustar legenda</summary>
            <p>Toque no botão quando ouvir a primeira frase da letra.</p>
            <button className="secondary-button" type="button" onClick={() => adjustLyrics(playerSeconds - Number(syncedLyrics[0].time))}>A primeira frase começa agora</button>
            <div className="lyrics-sync-actions">
              <button className="secondary-button" type="button" onClick={() => adjustLyrics(lyricOffset - 0.5)}>Adiantar 0,5 s</button>
              <button className="secondary-button" type="button" onClick={() => adjustLyrics(lyricOffset + 0.5)}>Atrasar 0,5 s</button>
              <button className="secondary-button" type="button" disabled={lyricOffset === 0} onClick={() => adjustLyrics(0)}>Restaurar</button>
            </div>
            <p role="status">{lyricOffset === 0 ? 'Sem ajuste.' : `Legenda ${Math.abs(lyricOffset).toLocaleString('pt-BR')} s ${lyricOffset > 0 ? 'mais tarde' : 'mais cedo'}.`}</p>
            <small>Vale só para este vídeo e fica na sua conta. Se o clipe tiver pausas no meio, prefira uma versão de áudio.</small>
          </details>
        )}
        {syncedLyrics.length > 0 && (
          <div className="lyrics-playback-controls">
            <button className="secondary-button" type="button" aria-pressed={Boolean(pausedLyrics)} onClick={toggleLyricsPause}>
              {pausedLyrics ? 'Retomar legenda' : 'Pausar legenda'}
            </button>
            <small role="status">{pausedLyrics ? 'Legenda pausada. O vídeo continua.' : ''}</small>
          </div>
        )}
        {syncedLyrics.length > 0 && activeLyricIndex < 0 && <p className="music-status">Aguardando início do canto.</p>}
        {activeKaraokeLine && (
          <section className="karaoke-panel" aria-label="Legenda da música">
            <span>{formatMusicTime(activeKaraokeLine.time)}</span>
            {lyricMode !== 'pt' && <strong>{activeKaraokeLine.en}</strong>}
            {lyricMode !== 'en' && <p>{lyricTranslation(activeKaraokeLine)}</p>}
            {nextKaraokeLine && <small>Próxima: {nextKaraokeLine.en}</small>}
          </section>
        )}

        <div className="mode-switch" aria-label="Modo da letra">
          <button className={lyricMode === 'both' ? 'active' : ''} type="button" onClick={() => setLyricMode('both')}>
            EN + PT
          </button>
          <button className={lyricMode === 'en' ? 'active' : ''} type="button" onClick={() => setLyricMode('en')}>
            EN
          </button>
          <button className={lyricMode === 'pt' ? 'active' : ''} type="button" onClick={() => setLyricMode('pt')}>
            PT
          </button>
        </div>

        <div className={lyricsStatus === 'error' ? 'form-error' : 'music-status'} role="status" aria-live="polite">
          {lyricsStatus === 'loading' && 'Buscando letra...'}
          {lyricsStatus === 'translating' && `Letra disponível com ${activeSong.lyrics.length} linhas. Traduzindo...`}
          {lyricsStatus === 'ready' && (syncedLyrics.length ? 'Letra sincronizada disponível.' : 'Letra disponível, sem sincronismo.')}
          {lyricsStatus === 'partial' && 'Letra disponível. Parte da tradução não está disponível agora.'}
          {lyricsStatus === 'error' && lyricsError}
        </div>

        {activeSong.lyrics.length ? (
          <div className="lyrics-list">
            {activeSong.lyrics.map((line, index) => (
              <button className={line.time !== undefined && activeKaraokeLine && Math.abs(line.time - Number(activeKaraokeLine.time)) < 0.01 ? 'lyric-card active' : 'lyric-card'} key={`${line.en}-${index}`} type="button" onClick={() => setExpandedLine(index)}>
                {line.time !== undefined && <em>{formatMusicTime(line.time)}</em>}
                {(lyricMode === 'both' || lyricMode === 'en') && <strong>{line.en}</strong>}
                {(lyricMode === 'both' || lyricMode === 'pt') && <span>{lyricTranslation(line)}</span>}
                {expandedLine === index && <small>{line.explain}</small>}
              </button>
            ))}
          </div>
        ) : (
          <section className="empty-lyrics">
            <h2>{isLoadingLyrics ? 'Carregando letra...' : 'Letra não carregada'}</h2>
            <button className="primary-button" type="button" disabled={isLoadingLyrics} onClick={() => setLyricsRetry(value => value + 1)}>
              {isLoadingLyrics ? 'Carregando...' : 'Carregar letra'}
            </button>
          </section>
        )}
      </div>

      {quiz.length > 0 && (
        <div className="quiz-modal" ref={quizDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Quiz de música">
          <section>
            {quizDone ? (
              <>
                <p className="kicker">Resultado</p>
                <h2>
                  {quizCorrect}/{quiz.length} corretas
                </h2>
                <p>Você ganhou {quizXp} XP com este treino musical.</p>
                <button className="primary-button" type="button" onClick={closeQuiz}>
                  Fechar
                </button>
              </>
            ) : (
              <>
                <p className="kicker">
                  {quizIndex + 1}/{quiz.length}
                </p>
                <p className="quiz-prompt">{currentQuestion?.prompt}</p>
                <h2>{currentQuestion?.line.en}</h2>
                <div className="quiz-choices">
                  {currentQuestion?.choices.map((choice) => {
                    const selected = quizAnswer === choice;
                    const correct = quizAnswer && choice === currentQuestion.correct;
                    return (
                      <button
                        className={`${selected ? 'selected' : ''} ${correct ? 'correct' : ''}`}
                        key={choice}
                        type="button"
                        onClick={() => answerQuiz(choice)}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
                {quizAnswer && (
                  <button className="primary-button" type="button" onClick={nextQuiz}>
                    Próxima
                  </button>
                )}
                <button className="ghost-button" type="button" onClick={closeQuiz}>
                  Sair do quiz
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
