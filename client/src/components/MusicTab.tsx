import { useEffect, useMemo, useState } from 'react';
import { findSong, getSongByKey, SONGS, SUGGESTIONS, type LyricLine, type Song } from '../data/music';
import { englishLevelDistance, normalizeEnglishLevel } from '../data/levels';
import { updateProfile, type FavoriteSong, type UserProfile } from '../services/auth';
import { extractYouTubeId, fetchSongLyrics, fetchYouTubeMetadata } from '../services/lyrics';

type MusicTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

type QuizQuestion = {
  line: LyricLine;
  choices: string[];
  correct: string;
};

function toFavorite(song: Song): FavoriteSong {
  return {
    key: song.key,
    title: song.title,
    artist: song.artist,
    ytId: song.ytId,
    level: song.level
  };
}

function createQuiz(song: Song): QuizQuestion[] {
  return song.lyrics
    .filter((line) => line.en && line.pt)
    .slice(0, 5)
    .map((line, index, lines) => {
      const wrongChoices = lines
        .filter((_, lineIndex) => lineIndex !== index)
        .map((candidate) => candidate.pt)
        .slice(0, 3);
      const choices = [line.pt, ...wrongChoices].sort(() => Math.random() - 0.5);
      return { line, choices, correct: line.pt };
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

function YouTubeFrame({ song }: { song: Song }) {
  const watchUrl = `https://www.youtube.com/watch?v=${song.ytId}`;
  const thumbUrl = `https://img.youtube.com/vi/${song.ytId}/hqdefault.jpg`;

  return (
    <a className="video-frame video-link" href={watchUrl} target="_blank" rel="noreferrer">
      <img src={thumbUrl} alt="" loading="lazy" />
      <span className="video-play" aria-hidden="true">▶</span>
      <strong>Assistir no YouTube</strong>
    </a>
  );
}

export function MusicTab({ user, onProfileRefresh }: MusicTabProps) {
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const suggestedSongs = useMemo(() => sortSongsForLevel(SUGGESTIONS as Song[], englishLevel), [englishLevel]);
  const [query, setQuery] = useState('');
  const [activeSong, setActiveSong] = useState<Song>(suggestedSongs[0] || SONGS[0]);
  const [lyricMode, setLyricMode] = useState<'both' | 'en' | 'pt'>('both');
  const [expandedLine, setExpandedLine] = useState<number | null>(0);
  const [notice, setNotice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizCorrect, setQuizCorrect] = useState(0);

  const favorites = useMemo(() => user.favorites || [], [user.favorites]);
  const isFavorite = favorites.some((favorite) => favorite.key === activeSong.key || favorite.ytId === activeSong.ytId);
  const currentQuestion = quiz[quizIndex] || null;
  const quizDone = quiz.length > 0 && quizIndex >= quiz.length;

  useEffect(() => {
    if (activeSong.key === SONGS[0].key) {
      setActiveSong(suggestedSongs[0] || SONGS[0]);
    }
  }, [activeSong.key, suggestedSongs]);

  function openSong(song: Song) {
    setActiveSong(song);
    setExpandedLine(0);
    setNotice('');
    closeQuiz();
  }

  async function hydrateLyrics(song: Song) {
    if (song.lyrics.length || isLoadingLyrics) return;

    try {
      setIsLoadingLyrics(true);
      setNotice('Buscando letra completa...');
      const lyrics = await fetchSongLyrics(song.title, song.artist);
      const hydratedSong = { ...song, lyrics };
      setActiveSong(hydratedSong);
      setNotice(`Letra carregada com ${lyrics.length} linhas.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Nao foi possivel carregar a letra agora.');
    } finally {
      setIsLoadingLyrics(false);
    }
  }

  async function handleSearch() {
    const trimmedQuery = query.trim();
    const youtubeId = extractYouTubeId(trimmedQuery);
    const song = findSong(trimmedQuery);

    if (song) {
      openSong(song as Song);
      await hydrateLyrics(song as Song);
      return;
    }

    if (!youtubeId) {
      setNotice('Nao encontrei essa musica. Tente nome + artista ou cole um link do YouTube.');
      return;
    }

    try {
      setIsSearching(true);
      setNotice('Lendo dados do YouTube...');
      const metadata = await fetchYouTubeMetadata(youtubeId);
      const [rawTitle, rawArtist = metadata.author || 'YouTube'] = metadata.title.split(' - ');
      const youtubeSong: Song = {
        key: `youtube-${youtubeId}`,
        title: rawTitle.trim() || metadata.title,
        artist: rawArtist.trim() || metadata.author || 'YouTube',
        ytId: youtubeId,
        level: 'Livre',
        thumb: 'YouTube',
        lyrics: []
      };
      openSong(youtubeSong);
      await hydrateLyrics(youtubeSong);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Nao consegui abrir esse link.');
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
    setNotice(isFavorite ? 'Musica removida dos favoritos.' : 'Musica salva nos favoritos.');
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
      lyrics: []
    });
  }

  function startQuiz() {
    const questions = createQuiz(activeSong);
    if (!questions.length) {
      setNotice('Esta musica ainda nao tem linhas suficientes para quiz no React.');
      return;
    }

    setQuiz(questions);
    setQuizIndex(0);
    setQuizAnswer('');
    setQuizCorrect(0);
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
  }

  return (
    <section className="music-layout" aria-label="Musica">
      <div className="music-sidebar">
        <section className="side-panel">
          <div className="panel-heading">
            <h2>Buscar musica</h2>
            <span>{SONGS.length} locais</span>
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
            <h2>Sugestoes</h2>
            <span>{englishLevel}</span>
          </div>
          <div className="song-list">
            {suggestedSongs.map((song) => (
              <button
                className={activeSong.key === song.key ? 'song-row active' : 'song-row'}
                key={song.key}
                type="button"
                onClick={() => openSong(song as Song)}
              >
                <span>{song.thumb}</span>
                <strong>{song.title}</strong>
                <small>{song.artist}</small>
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
            <p>Salve uma musica para revisar depois.</p>
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
          </div>
          <div className="music-actions">
            <button className="secondary-button" type="button" onClick={toggleFavorite}>
              {isFavorite ? 'Remover favorito' : 'Favoritar'}
            </button>
            <button className="secondary-button" type="button" disabled={isLoadingLyrics || activeSong.lyrics.length > 0} onClick={() => hydrateLyrics(activeSong)}>
              {isLoadingLyrics ? 'Carregando...' : 'Carregar letra'}
            </button>
            <button className="primary-button" type="button" onClick={startQuiz}>
              Quiz
            </button>
          </div>
        </header>

        <YouTubeFrame song={activeSong} />

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
              <button className="lyric-card" key={`${line.en}-${index}`} type="button" onClick={() => setExpandedLine(index)}>
                {(lyricMode === 'both' || lyricMode === 'en') && <strong>{line.en}</strong>}
                {(lyricMode === 'both' || lyricMode === 'pt') && <span>{line.pt}</span>}
                {expandedLine === index && <small>{line.explain}</small>}
              </button>
            ))}
          </div>
        ) : (
          <section className="empty-lyrics">
            <h2>Letra nao carregada</h2>
            <p>Use o botao de letra para consultar a API e montar o modo de estudo automaticamente.</p>
            <button className="primary-button" type="button" disabled={isLoadingLyrics} onClick={() => hydrateLyrics(activeSong)}>
              {isLoadingLyrics ? 'Carregando...' : 'Carregar letra'}
            </button>
          </section>
        )}
      </div>

      {quiz.length > 0 && (
        <div className="quiz-modal" role="dialog" aria-modal="true" aria-label="Quiz de musica">
          <section>
            {quizDone ? (
              <>
                <p className="kicker">Resultado</p>
                <h2>
                  {quizCorrect}/{quiz.length} corretas
                </h2>
                <p>Continue revisando a letra para fixar vocabulario.</p>
                <button className="primary-button" type="button" onClick={closeQuiz}>
                  Fechar
                </button>
              </>
            ) : (
              <>
                <p className="kicker">
                  {quizIndex + 1}/{quiz.length}
                </p>
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
                    Proxima
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
