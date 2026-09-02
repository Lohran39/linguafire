import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { findSong, getSongByKey, SONGS, SUGGESTIONS, type LyricLine, type Song } from '../data/music';
import { englishLevelDistance, normalizeEnglishLevel } from '../data/levels';
import { updateProfile, type FavoriteSong, type UserProfile } from '../services/auth';
import { extractYouTubeId, fetchSongLyrics, fetchYouTubeMetadata, musicSearchToLyrics, parseYouTubeMusicMetadata, reportMusicVideoStatus, searchMusicByName } from '../services/lyrics';

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
          };
          events?: {
            onReady?: (event: { target: { getCurrentTime: () => number } }) => void;
            onError?: (event: { data?: number | string }) => void;
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
  const usableLines = shuffleItems(song.lyrics.filter((line) => line.en && line.pt));

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

function YouTubeFrame({ song, onTimeChange }: { song: Song; onTimeChange: (seconds: number) => void }) {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<{ destroy?: () => void } | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);
  const [embedHost, setEmbedHost] = useState<'youtube' | 'nocookie'>('youtube');
  const candidateIds = useMemo(() => {
    const ids = [song.ytId, ...(song.videoCandidates || []).map((candidate) => candidate.videoId)];
    return [...new Set(ids.filter(Boolean))];
  }, [song.videoCandidates, song.ytId]);
  const candidatesKey = candidateIds.join(',');
  const [candidateIndex, setCandidateIndex] = useState(0);
  const currentVideoId = candidateIds[candidateIndex] || song.ytId;
  const watchUrl = `https://www.youtube.com/watch?v=${currentVideoId}`;
  const thumbUrl = `https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`;
  const embedBaseUrl = embedHost === 'youtube' ? 'https://www.youtube.com' : 'https://www.youtube-nocookie.com';
  const playerKey = `${embedHost}:${currentVideoId}`;

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
    reportCurrentVideo('bad', reason);
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
    onTimeChange(0);
  }, [candidatesKey, onTimeChange, song.ytId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!embedLoaded) failCurrentVideo('timeout');
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [embedLoaded, playerKey, failCurrentVideo]);

  useEffect(() => {
    let intervalId: number | undefined;
    let cancelled = false;

    function startPlayer() {
      if (cancelled || !playerRef.current || !window.YT?.Player) return;
      playerInstanceRef.current?.destroy?.();
      const playerTarget = document.createElement('div');
      playerRef.current.replaceChildren(playerTarget);

      playerInstanceRef.current = new window.YT.Player(playerTarget, {
        videoId: currentVideoId,
        host: embedBaseUrl,
        playerVars: {
          origin: window.location.origin,
          enablejsapi: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event) => {
            setEmbedLoaded(true);
            setEmbedFailed(false);
            reportCurrentVideo('working');
            intervalId = window.setInterval(() => {
              const currentTime = Number(event.target.getCurrentTime?.() || 0);
              if (Number.isFinite(currentTime)) onTimeChange(currentTime);
            }, 600);
          },
          onError: (event) => {
            failCurrentVideo(`youtube_${event.data || 'error'}`);
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
          failCurrentVideo('iframe_api_blocked');
        };
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
      playerInstanceRef.current?.destroy?.();
      playerInstanceRef.current = null;
      playerRef.current?.replaceChildren();
    };
  }, [currentVideoId, failCurrentVideo, onTimeChange, reportCurrentVideo]);

  return (
    <section className="video-frame music-embed" aria-label={`Vídeo de ${song.title}`}>
      <div key={playerKey} ref={playerRef} className="youtube-player" title={`${song.title} - ${song.artist}`} />
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
            <span>A letra já carregou. Tente recarregar o vídeo dentro do site ou abra no YouTube se o dono bloquear embed.</span>
            <button
              type="button"
              onClick={() => {
              setEmbedLoaded(false);
              setEmbedFailed(false);
              setEmbedHost((host) => (host === 'youtube' ? 'nocookie' : 'youtube'));
              setCandidateIndex(0);
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
  const [query, setQuery] = useState('');
  const [musicFilter, setMusicFilter] = useState<MusicFilter>('recommended');
  const suggestedSongs = useMemo(() => {
    const sorted = sortSongsForLevel(SUGGESTIONS as Song[], englishLevel);
    if (musicFilter === 'recommended') return sorted;
    return sorted.filter((song) => song.tags.includes(musicFilter));
  }, [englishLevel, musicFilter]);
  const visibleSongs = suggestedSongs.length ? suggestedSongs : sortSongsForLevel(SUGGESTIONS as Song[], englishLevel);
  const [activeSong, setActiveSong] = useState<Song>(visibleSongs[0] || SONGS[0]);
  const [lyricMode, setLyricMode] = useState<'both' | 'en' | 'pt'>('both');
  const [expandedLine, setExpandedLine] = useState<number | null>(0);
  const [notice, setNotice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsTriedKeys, setLyricsTriedKeys] = useState<Set<string>>(() => new Set());
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizRewarded, setQuizRewarded] = useState(false);
  const [playerSeconds, setPlayerSeconds] = useState(0);

  const favorites = useMemo(() => user.favorites || [], [user.favorites]);
  const isFavorite = favorites.some((favorite) => favorite.key === activeSong.key || favorite.ytId === activeSong.ytId);
  const currentQuestion = quiz[quizIndex] || null;
  const quizDone = quiz.length > 0 && quizIndex >= quiz.length;
  const quizXp = quizCorrect * 10 + (quiz.length > 0 && quizCorrect === quiz.length ? 25 : 0);
  const syncedLyrics = activeSong.lyrics.filter((line) => line.time !== undefined);
  const activeLyricIndex = syncedLyrics.reduce((activeIndex, line, index) => {
    return Number(line.time) <= playerSeconds + 0.2 ? index : activeIndex;
  }, 0);
  const activeKaraokeLine = syncedLyrics[activeLyricIndex] || null;
  const nextKaraokeLine = syncedLyrics[activeLyricIndex + 1] || null;

  useEffect(() => {
    if (activeSong.tags.includes('custom') || activeSong.tags.includes('favorite')) return;
    if (!visibleSongs.some((song) => song.key === activeSong.key)) {
      setActiveSong(visibleSongs[0] || SONGS[0]);
    }
  }, [activeSong.key, visibleSongs]);

  useEffect(() => {
    if (!activeSong.lyrics.length) {
      void hydrateLyrics(activeSong);
    }
  }, [activeSong.key]);

  useEffect(() => {
    if (!quizDone || quizRewarded) return;

    const nextUser = {
      ...user,
      xp: Number(user.xp || 0) + quizXp,
      correct_answers: Number(user.correct_answers || 0) + quizCorrect
    };

    setQuizRewarded(true);
    updateProfile({ xp: nextUser.xp, correct_answers: nextUser.correct_answers })
      .then(() => {
        onProfileRefresh(nextUser);
      })
      .catch(() => {
        setNotice('Quiz concluído, mas não consegui salvar o XP agora.');
      });
  }, [onProfileRefresh, quizCorrect, quizDone, quizRewarded, quizXp, user]);

  function openSong(song: Song, autoLoadLyrics = true) {
    setActiveSong(song);
    setExpandedLine(0);
    setNotice('');
    closeQuiz();
    if (autoLoadLyrics) {
      void hydrateLyrics(song);
    }
  }

  async function hydrateLyrics(
    song: Song,
    force = false,
    source?: { videoTitle?: string; channelName?: string }
  ) {
    if (song.lyrics.length || isLoadingLyrics) return;
    if (!force && lyricsTriedKeys.has(song.key)) return;

    try {
      setLyricsTriedKeys((keys) => new Set(keys).add(song.key));
      setIsLoadingLyrics(true);
      setNotice('Buscando letra completa...');
      const lyrics = await fetchSongLyrics(song.title, song.artist, 80, source);
      const hydratedSong = { ...song, lyrics };
      setActiveSong(hydratedSong);
      const hasSyncedLines = lyrics.some((line) => line.time !== undefined);
      setNotice(hasSyncedLines
        ? `Legenda sincronizada carregada com ${lyrics.length} linhas.`
        : `Letra carregada com ${lyrics.length} linhas. Esta música não tem sincronismo disponível agora.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível carregar a letra agora.');
    } finally {
      setIsLoadingLyrics(false);
    }
  }

  async function handleSearch() {
    const trimmedQuery = query.trim();
    const youtubeId = extractYouTubeId(trimmedQuery);
    const song = findSong(trimmedQuery);

    if (song) {
      openSong(song as Song, false);
      await hydrateLyrics(song as Song, true);
      return;
    }

    try {
      setIsSearching(true);
      setNotice(youtubeId ? 'Lendo dados do YouTube...' : 'Buscando música no YouTube...');
      const foundMusic = youtubeId ? null : await searchMusicByName(trimmedQuery);
      const metadata = youtubeId ? await fetchYouTubeMetadata(youtubeId) : null;
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
      const lyricsFromSearch = foundMusic ? await musicSearchToLyrics(foundMusic) : [];
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
        lyrics: lyricsFromSearch
      };
      openSong(youtubeSong, false);
      if (lyricsFromSearch.length) {
        const hasSyncedLines = lyricsFromSearch.some((line) => line.time !== undefined);
        setNotice(hasSyncedLines
          ? `Vídeo e legenda sincronizada carregados com ${lyricsFromSearch.length} linhas.`
          : `Vídeo e letra carregados com ${lyricsFromSearch.length} linhas. Esta música não tem sincronismo disponível agora.`);
      } else {
        await hydrateLyrics(youtubeSong, true, {
          videoTitle: parsedMetadata.videoTitle,
          channelName: parsedMetadata.channelName
        });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não consegui abrir esse link.');
    } finally {
      setIsSearching(false);
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

    setQuiz(questions);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizCorrect(0);
    setQuizRewarded(false);
    setNotice('');
  }

  function answerQuiz(choice: string) {
    if (!currentQuestion || quizAnswer) return;
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
            <span>{SUGGESTIONS.length} músicas</span>
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
          {notice && <div className="form-success">{notice}</div>}
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
            {visibleSongs.map((song) => (
              <button
                className={activeSong.key === song.key ? 'song-row active' : 'song-row'}
                key={song.key}
                type="button"
                onClick={() => openSong(song as Song)}
              >
                <span>{song.thumb}</span>
                <strong>{song.title}</strong>
                <small>{song.artist} · {song.focus}</small>
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
            <button className="secondary-button" type="button" disabled={isLoadingLyrics || activeSong.lyrics.length > 0} onClick={() => hydrateLyrics(activeSong, true)}>
              {isLoadingLyrics ? 'Carregando...' : 'Carregar letra'}
            </button>
            <button className="primary-button" type="button" onClick={startQuiz}>
              Quiz
            </button>
          </div>
        </header>

        <YouTubeFrame song={activeSong} onTimeChange={setPlayerSeconds} />

        {activeKaraokeLine && (
          <section className="karaoke-panel" aria-label="Legenda da música">
            <span>{formatMusicTime(activeKaraokeLine.time)}</span>
            <strong>{activeKaraokeLine.en}</strong>
            <p>{activeKaraokeLine.pt}</p>
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

        {activeSong.lyrics.length ? (
          <div className="lyrics-list">
            {activeSong.lyrics.map((line, index) => (
              <button className={line.time !== undefined && Math.abs((line.time || 0) - (activeKaraokeLine?.time || -999)) < 0.01 ? 'lyric-card active' : 'lyric-card'} key={`${line.en}-${index}`} type="button" onClick={() => setExpandedLine(index)}>
                {line.time !== undefined && <em>{formatMusicTime(line.time)}</em>}
                {(lyricMode === 'both' || lyricMode === 'en') && <strong>{line.en}</strong>}
                {(lyricMode === 'both' || lyricMode === 'pt') && <span>{line.pt}</span>}
                {expandedLine === index && <small>{line.explain}</small>}
              </button>
            ))}
          </div>
        ) : (
          <section className="empty-lyrics">
            <h2>Letra não carregada</h2>
            <p>Carregue a letra para transformar a música em estudo com tradução, explicação e quiz.</p>
            <button className="primary-button" type="button" disabled={isLoadingLyrics} onClick={() => hydrateLyrics(activeSong, true)}>
              {isLoadingLyrics ? 'Carregando...' : 'Carregar letra'}
            </button>
          </section>
        )}
      </div>

      {quiz.length > 0 && (
        <div className="quiz-modal" role="dialog" aria-modal="true" aria-label="Quiz de música">
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
