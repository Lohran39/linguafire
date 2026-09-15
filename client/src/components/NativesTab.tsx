import { nativeDailyGoal, nativeSituations, nativePacks, nativePhrases, getLevelIndex, getRecommendedPhrases, type NativeSituationId } from '../data/native-practice';
import { normalizePracticeText, comparePracticeText } from '../services/native-practice';
import { NativeVideoResult } from './NativeVideoResult';
import { contentKey, getCurations, isVerified, type CurationItem } from '../services/curation';
import { recordLearning } from '../services/learning';
import { useActivityState } from '../hooks/activity-progress';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { resolveLevel, normalizeEnglishLevel, type EnglishLevel } from '../data/levels';
import { updateProfile } from '../services/profile';
import { type UserProfile } from '../services/auth';
import {
  buildNativesFallbackUrl,
  buildRetryVariants,
  coachNativeReply,
  deleteSavedNativeVideo,
  getSavedNativeVideos,
  nativeLanguages,
  nativeSuggestions,
  reportBadNativeVideo,
  saveNativeVideo,
  searchNatives,
  type NativeCoachResult,
  type NativeCoachTurn,
  type NativeSavedVideo,
  type NativesLanguage,
  type NativesSearchResult
} from '../services/natives';

type NativePracticeHistoryItem = {
  id: string;
  phraseId: string;
  situation: NativeSituationId;
  level: EnglishLevel;
  score: number;
  xp: number;
  date: string;
  natural: string;
};

type NativeSearchHistoryItem = {
  query: string;
  lang: NativesLanguage;
  date: string;
};

type NativesTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

function readBadNativeVideos(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_error) {
    return [];
  }
}

function readSavedNativeVideos(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.id && item?.query && item?.lang && item?.date)
      : [];
  } catch (_error) {
    return [];
  }
}

function readNativeSearchHistory(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.query && item?.lang && item?.date)
      : [];
  } catch (_error) {
    return [];
  }
}

export function NativesTab({ user, onProfileRefresh }: NativesTabProps) {
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const [practiceMode, setPracticeMode] = useState<'shadow' | 'dictation' | 'coach'>('shadow');
  const [curations, setCurations] = useState<CurationItem[]>([]);
  const [curationUnavailable, setCurationUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    getCurations('native').then(items => { if (active) setCurations(items); }).catch(() => { if (active) setCurationUnavailable(true); });
    return () => { active = false; };
  }, []);
  const [query, setQuery] = useActivityState('natives', 'query', 'look forward to');
  const [lang, setLang] = useActivityState<NativesLanguage>('natives', 'lang', 'english');
  const [result, setResult] = useActivityState<NativesSearchResult | null>('natives', 'result', null);
  const [activeVideo, setActiveVideo] = useActivityState('natives', 'activeVideo', '');
  const [lastQuery, setLastQuery] = useActivityState('natives', 'lastQuery', '');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [selectedSituation, setSelectedSituation] = useActivityState<NativeSituationId>('natives', 'selectedSituation', 'restaurant');
  const [selectedPhraseId, setSelectedPhraseId] = useActivityState('natives', 'selectedPhraseId', nativePhrases[0].id);
  const [answer, setAnswer] = useActivityState('natives', 'answer', '');
  const [coachResult, setCoachResult] = useActivityState<NativeCoachResult | null>('natives', 'coachResult', null);
  const [coachError, setCoachError] = useState('');
  const [isCoaching, setIsCoaching] = useState(false);
  const [coachHistory, setCoachHistory] = useActivityState<NativeCoachTurn[]>('natives', 'coachHistory', []);
  const coachRequestRef = useRef<AbortController | null>(null);
  const coachHistoryRef = useRef<HTMLDivElement>(null);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useActivityState('natives', 'progressMessage', '');
  const [shadowMessage, setShadowMessage] = useState('');
  const [dictationAttempt, setDictationAttempt] = useActivityState('natives', 'dictationAttempt', () => crypto.randomUUID());
  const [dictationAnswer, setDictationAnswer] = useActivityState('natives', 'dictationAnswer', '');
  const [dictationMessage, setDictationMessage] = useActivityState('natives', 'dictationMessage', '');
  const [savedVideoMessage, setSavedVideoMessage] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [practiceHistory, setPracticeHistory] = useState<NativePracticeHistoryItem[]>([]);
  const [badVideoIds, setBadVideoIds] = useState<string[]>([]);
  const [savedVideos, setSavedVideos] = useState<NativeSavedVideo[]>([]);
  const [searchHistory, setSearchHistory] = useState<NativeSearchHistoryItem[]>([]);

  const favoriteKey = `linguafire:natives-favorites:${user.id}`;
  const historyKey = `linguafire:natives-history:${user.id}`;
  const savedVideosKey = `linguafire:natives-saved-videos:${user.id}`;
  const searchHistoryKey = `linguafire:natives-search-history:${user.id}`;
  const activeSearchQuery = (lastQuery || query).trim();
  const badVideoKey = `linguafire:natives-bad-videos:${lang}:${activeSearchQuery}`;
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedSituationData = nativeSituations.find((item) => item.id === selectedSituation) || nativeSituations[0];
  const recommendedPhrases = useMemo(
    () => getRecommendedPhrases(englishLevel, selectedSituation),
    [englishLevel, selectedSituation]
  );
  const selectedPhrase = nativePhrases.find((phrase) => phrase.id === selectedPhraseId) || recommendedPhrases[0] || nativePhrases[0];
  const favoritePhrases = nativePhrases.filter((phrase) => favorites.includes(phrase.id));
  const visibleVideoIds = (result?.videoIds || []).filter((id) => !badVideoIds.includes(id));
  const completedNativePhrases = useMemo(
    () => new Set((user.achievements || []).filter((achievement) => achievement.startsWith('native-phrase-'))),
    [user.achievements]
  );
  const savedCurrentPhrase = completedNativePhrases.has(`native-phrase-${selectedPhrase.id}`);
  const nativeCompletedCount = completedNativePhrases.size;
  const todayHistory = practiceHistory.filter((item) => item.date.startsWith(todayKey));
  const dailyGoalProgress = Math.min(100, Math.round((todayHistory.length / nativeDailyGoal) * 100));
  const bestTodayScore = todayHistory.reduce((best, item) => Math.max(best, item.score), 0);
  const recentHistory = practiceHistory.slice(0, 5);
  const activeVideoSaved = savedVideos.some((item) => item.id === activeVideo);
  const recentSavedVideos = savedVideos.slice(0, 6);
  const recentSearches = searchHistory.slice(0, 8);
  const recommendedReviewPhrases = useMemo(() => {
    const completed = completedNativePhrases;
    const unseen = nativePhrases
      .filter((phrase) => getLevelIndex(phrase.level) <= getLevelIndex(englishLevel) + 1)
      .filter((phrase) => !completed.has(`native-phrase-${phrase.id}`))
      .slice(0, 6);
    const favoriteReview = favoritePhrases.slice(0, 3);
    return [...favoriteReview, ...unseen]
      .filter((phrase, index, items) => items.findIndex((candidate) => candidate.id === phrase.id) === index)
      .slice(0, 6);
  }, [completedNativePhrases, englishLevel, favoritePhrases]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(favoriteKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setFavorites(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
    } catch (_error) {
      setFavorites([]);
    }
  }, [favoriteKey]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(historyKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setPracticeHistory(Array.isArray(parsed) ? parsed.filter((item) => item?.phraseId && item?.date) : []);
    } catch (_error) {
      setPracticeHistory([]);
    }
  }, [historyKey]);

  useEffect(() => {
    setBadVideoIds(readBadNativeVideos(badVideoKey));
  }, [badVideoKey]);

  useEffect(() => {
    setSavedVideos(readSavedNativeVideos(savedVideosKey));
    getSavedNativeVideos()
      .then((videos) => {
        setSavedVideos(videos);
        window.localStorage.setItem(savedVideosKey, JSON.stringify(videos));
      })
      .catch(() => undefined);
  }, [savedVideosKey]);

  useEffect(() => {
    setSearchHistory(readNativeSearchHistory(searchHistoryKey));
  }, [searchHistoryKey]);

  function resetCoach() {
    coachRequestRef.current?.abort();
    coachRequestRef.current = null;
    setIsCoaching(false);
    setCoachHistory([]);
    setCoachResult(null);
    setCoachError('');
    setAnswer('');
    setProgressMessage('');
  }

  const coachContext = `${user.id}-${selectedSituation}-${selectedPhraseId}-${englishLevel}`;
  const previousCoachContext = useRef(coachContext);
  useEffect(() => {
    if (previousCoachContext.current !== coachContext) resetCoach();
    previousCoachContext.current = coachContext;
    return () => {
      coachRequestRef.current?.abort();
      coachRequestRef.current = null;
    };
  }, [user.id, selectedSituation, selectedPhraseId, englishLevel]);

  useEffect(() => {
    const container = coachHistoryRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [coachHistory]);

  function saveFavorites(nextFavorites: string[]) {
    setFavorites(nextFavorites);
    window.localStorage.setItem(favoriteKey, JSON.stringify(nextFavorites));
  }

  function savePracticeHistory(item: NativePracticeHistoryItem) {
    const nextHistory = [item, ...practiceHistory]
      .filter((historyItem, index, items) => items.findIndex((candidate) => candidate.id === historyItem.id) === index)
      .slice(0, 60);
    setPracticeHistory(nextHistory);
    window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
  }

  function saveNativeVideos(nextVideos: NativeSavedVideo[]) {
    setSavedVideos(nextVideos);
    window.localStorage.setItem(savedVideosKey, JSON.stringify(nextVideos));
  }

  function saveSearchHistory(item: NativeSearchHistoryItem) {
    const nextHistory = [item, ...searchHistory]
      .filter((historyItem, index, items) => (
        items.findIndex((candidate) => candidate.query.toLowerCase() === historyItem.query.toLowerCase() && candidate.lang === historyItem.lang) === index
      ))
      .slice(0, 24);
    setSearchHistory(nextHistory);
    window.localStorage.setItem(searchHistoryKey, JSON.stringify(nextHistory));
  }

  async function toggleSavedVideo() {
    if (!activeVideo || !activeSearchQuery) return;

    setSavedVideoMessage('');
    const exists = savedVideos.some((item) => item.id === activeVideo);
    const nextVideos = exists
      ? savedVideos.filter((item) => item.id !== activeVideo)
      : [
          {
            id: activeVideo,
            query: activeSearchQuery,
            lang,
            date: new Date().toISOString()
          },
          ...savedVideos
        ]
          .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
          .slice(0, 40);

    saveNativeVideos(nextVideos);

    try {
      if (exists) {
        await deleteSavedNativeVideo(activeVideo);
        setSavedVideoMessage('Vídeo removido da sua biblioteca.');
      } else {
        await saveNativeVideo({ query: activeSearchQuery, lang, videoId: activeVideo });
        setSavedVideoMessage('Vídeo salvo na sua conta.');
      }
    } catch (_error) {
      setSavedVideoMessage('Salvo neste navegador. Rode a migration para sincronizar na conta.');
    }
  }

  function toggleFavorite(phraseId: string) {
    const nextFavorites = favorites.includes(phraseId)
      ? favorites.filter((id) => id !== phraseId)
      : [...favorites, phraseId];
    saveFavorites(nextFavorites);
  }

  function completeShadowPractice(rounds = 1) {
    const score = rounds >= 3 ? 88 : rounds === 2 ? 78 : 68;
    const xp = rounds >= 3 ? 10 : rounds === 2 ? 8 : 5;
    setShadowMessage(rounds >= 3
      ? `Sequência completa: você treinou ritmo, pausa e entonação.`
      : `Bom começo. Faça ${3 - rounds} rodada(s) a mais para fixar "${selectedPhrase.natural}".`);
    savePracticeHistory({
      id: `shadow-${selectedPhrase.id}-${Date.now()}`,
      phraseId: selectedPhrase.id,
      situation: selectedPhrase.situation,
      level: selectedPhrase.level,
      score,
      xp,
      date: new Date().toISOString(),
      natural: selectedPhrase.natural
    });
  }

  function checkDictation() {
    const expected = normalizePracticeText(selectedPhrase.natural);
    const received = normalizePracticeText(dictationAnswer);
    if (!received) {
      setDictationMessage('Ouça a frase e escreva o que você entendeu.');
      return;
    }

    const comparison = comparePracticeText(selectedPhrase.natural, dictationAnswer);
    recordLearning(user.id, 'dictation', comparison.score, `${dictationAttempt}:${selectedPhrase.id}`);

    if (received === expected || comparison.score >= 92) {
      setDictationMessage(`Perfeito: ${comparison.score}%. Você escreveu a frase natural corretamente.`);
      savePracticeHistory({
        id: `dictation-${selectedPhrase.id}-${Date.now()}`,
        phraseId: selectedPhrase.id,
        situation: selectedPhrase.situation,
        level: selectedPhrase.level,
        score: 95,
        xp: 8,
        date: new Date().toISOString(),
        natural: selectedPhrase.natural
      });
      return;
    }

    setDictationMessage([
      `Resultado: ${comparison.score}%.`,
      comparison.missing.length ? `Faltou: ${comparison.missing.join(', ')}.` : '',
      comparison.extra.length ? `Sobrou: ${comparison.extra.join(', ')}.` : '',
      `Correto: ${selectedPhrase.natural}`
    ].filter(Boolean).join(' '));
  }

  function speakText(text: string, rate = 0.86) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'english-uk' ? 'en-GB' : lang === 'english-au' ? 'en-AU' : 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }

  async function performSearch(nextQuery = query, nextLang = lang) {
    const trimmed = nextQuery.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setError('');
    setSavedVideoMessage('');
    setResult(null);
    setActiveVideo('');
    setLastQuery(trimmed);
    setQuery(trimmed);

    try {
      const data = await searchNatives(trimmed, nextLang);
      setResult(data);
      const badIds = readBadNativeVideos(`linguafire:natives-bad-videos:${nextLang}:${trimmed}`);
      setBadVideoIds(badIds);
      setActiveVideo((data.videoIds || []).find((id) => !badIds.includes(id)) || '');
      saveSearchHistory({ query: trimmed, lang: nextLang, date: new Date().toISOString() });
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Erro ao buscar vídeos.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCoachSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || isCoaching || coachRequestRef.current) return;
    const controller = new AbortController();
    coachRequestRef.current = controller;

    setIsCoaching(true);
    setCoachError('');
    setCoachResult(null);
    setProgressMessage('');
    try {
      const data = await coachNativeReply({
        situationId: selectedSituation,
        englishLevel,
        prompt: selectedPhrase.prompt,
        target: selectedPhrase.natural,
        answer: trimmed,
        history: coachHistory
      }, controller.signal);
      if (coachRequestRef.current !== controller) return;
      recordLearning(user.id, 'native_coach', data.score);
      setCoachResult(data);
      setCoachHistory((previous) => [...previous, { answer: trimmed, reply: data.nextReply }].slice(-10));
      setAnswer('');
    } catch (coachRequestError) {
      if (coachRequestRef.current !== controller || controller.signal.aborted) return;
      setCoachError(coachRequestError instanceof Error ? coachRequestError.message : 'Erro ao treinar resposta.');
    } finally {
      if (coachRequestRef.current === controller) {
        coachRequestRef.current = null;
        setIsCoaching(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    performSearch();
  }

  async function saveNativeProgress() {
    if (!coachResult || isSavingProgress) return;

    const nextAchievements = new Set(user.achievements || []);
    const completedAchievement = `native-phrase-${selectedPhrase.id}`;
    const wasAlreadyCompleted = nextAchievements.has(completedAchievement);
    const isStrongAnswer = coachResult.score >= 80;
    const earnedXp = wasAlreadyCompleted ? Math.max(4, Math.round(coachResult.score / 18)) : Math.max(10, Math.round(coachResult.score / 4));

    nextAchievements.add(completedAchievement);
    if (isStrongAnswer) {
      nextAchievements.add(`native-strong-${selectedPhrase.id}`);
    }

    const nextXp = Number(user.xp || 0) + earnedXp;
    const nextUser: UserProfile = {
      ...user,
      xp: nextXp,
      level: Math.max(Number(user.level || 1), resolveLevel(nextXp)),
      correct_answers: Number(user.correct_answers || 0) + (isStrongAnswer ? 1 : 0),
      achievements: Array.from(nextAchievements)
    };

    try {
      setIsSavingProgress(true);
      setProgressMessage('');
      await updateProfile({
        xp_base: Number(user.xp || 0),
        xp: nextUser.xp,
        level: nextUser.level,
        correct_answers: nextUser.correct_answers,
        achievements: nextUser.achievements
      });
      savePracticeHistory({
        id: `${selectedPhrase.id}-${Date.now()}`,
        phraseId: selectedPhrase.id,
        situation: selectedPhrase.situation,
        level: selectedPhrase.level,
        score: coachResult.score,
        xp: earnedXp,
        date: new Date().toISOString(),
        natural: selectedPhrase.natural
      });
      onProfileRefresh(nextUser);
      setProgressMessage(wasAlreadyCompleted ? `Treino repetido salvo. +${earnedXp} XP` : `Progresso salvo. +${earnedXp} XP`);
    } catch (error) {
      setProgressMessage(error instanceof Error ? error.message : 'Não foi possível salvar o progresso.');
    } finally {
      setIsSavingProgress(false);
    }
  }

  async function markActiveVideoAsBad() {
    if (!activeVideo) return;
    try {
      await reportBadNativeVideo({ query: activeSearchQuery, lang, videoId: activeVideo });
    } catch (error) {
      setSavedVideoMessage(error instanceof Error ? error.message : 'A denúncia não foi enviada.');
      return;
    }

    const nextBadIds = [...new Set([...badVideoIds, activeVideo])];
    setBadVideoIds(nextBadIds);
    window.localStorage.setItem(badVideoKey, JSON.stringify(nextBadIds));

    const nextVideo = (result?.videoIds || []).find((id) => id !== activeVideo && !nextBadIds.includes(id)) || '';
    setActiveVideo(nextVideo);
    setSavedVideoMessage('Denúncia enviada para revisão.');
  }

  function restoreBadVideosForSearch() {
    if (!result) return;

    setBadVideoIds([]);
    window.localStorage.removeItem(badVideoKey);
    setActiveVideo(result.videoIds?.[0] || '');
  }

  const contentIdentity = { kind: 'native' as const, title: activeSearchQuery, lang, videoId: activeVideo };
  const activeCuration = curations.find(item => item.content_key === contentKey(contentIdentity) && item.video_id === activeVideo);
  const verifiedSuggestions = [...new Set([...curations.filter(item => item.lang === lang && isVerified(item)).map(item => item.title), ...nativeSuggestions])];
  const fallbackUrl = result?.searchUrl || buildNativesFallbackUrl(lastQuery || query, lang);
  const retryVariants = buildRetryVariants(lastQuery || query);

  return (
    <section className="natives-layout" aria-label="Nativos">
      <header className="natives-hero">
        <p className="kicker">Nativos</p>
        <h1>Inglês na vida real</h1>
        <p className="lead">
          Escolha uma expressão, assista e pratique no seu nível {englishLevel}.
        </p>
        <details className="native-disclosure"><summary>Meu progresso · {todayHistory.length}/{nativeDailyGoal} hoje</summary>
        <div className="native-progress-strip" aria-label="Progresso em Nativos">
          <span>{nativeCompletedCount}</span>
          <strong>frases treinadas</strong>
          <small>{user.xp || 0} XP total</small>
        </div>
        <div className="native-daily-panel">
          <div>
            <span>Meta diária</span>
            <strong>{todayHistory.length}/{nativeDailyGoal}</strong>
            <small>{bestTodayScore ? `melhor score hoje: ${bestTodayScore}` : 'treine 3 frases hoje'}</small>
          </div>
          <div className="progress-track" aria-label={`Meta diária ${dailyGoalProgress}%`}>
            <div style={{ width: `${dailyGoalProgress}%` }} />
          </div>
        </div>
        </details>
      </header>

      <section className="native-section">
        <div className="panel-heading">
          <div>
            <p className="kicker">Vídeos reais</p>
            <h2>Busque a expressão no contexto</h2>
          </div>
        </div>
        <form className="natives-search" onSubmit={handleSubmit}>
          <input
            className="field"
            id="nativesInput"
            aria-label="Expressão para buscar em vídeos"
            placeholder="Ex: look forward to"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="primary-button" disabled={isSearching || !query.trim()} id="nativesSearchBtn" type="submit">
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <p className="native-suggestion-label">Sugestões para {englishLevel}</p>
        <div className="suggestion-tags">
          {nativePhrases.filter(phrase => phrase.level === englishLevel).slice(0, 3).map(phrase => (
            <button key={phrase.id} type="button" onClick={() => { setSelectedSituation(phrase.situation); setSelectedPhraseId(phrase.id); setDictationAnswer(''); setShadowMessage(''); setDictationMessage(''); setProgressMessage(''); setLang('english'); performSearch(phrase.natural, 'english'); }}>
              {phrase.natural}
            </button>
          ))}
        </div>
        <details className="native-disclosure"><summary>Mais opções de busca</summary>
          <select aria-label="Idioma dos vídeos" value={lang} onChange={(event) => setLang(event.target.value as NativesLanguage)}>
            {nativeLanguages.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="suggestion-tags">
            {verifiedSuggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => performSearch(suggestion)}>{suggestion}</button>)}
          </div>
        </details>
      </section>
      {error && <div className="form-error">{error}</div>}

      {activeVideo && <NativeVideoResult activeVideo={activeVideo} lastQuery={lastQuery} activeCuration={activeCuration}
        contentIdentity={contentIdentity} curationUnavailable={curationUnavailable} activeVideoSaved={activeVideoSaved}
        savedVideoMessage={savedVideoMessage} visibleVideoIds={visibleVideoIds} toggleSavedVideo={toggleSavedVideo}
        markActiveVideoAsBad={markActiveVideoAsBad} setActiveVideo={setActiveVideo} />}

      {result && !activeVideo && (
        <section className="natives-fallback">
          <span>Modo nativo</span>
          <h2>Refine a busca aqui dentro</h2>
          <p>
            {badVideoIds.length > 0 && (result.videoIds || []).length > 0
              ? 'Todos os vídeos encontrados para essa busca foram marcados como ruins.'
              : result.reason === 'providers_unavailable'
                ? 'A busca automática não conseguiu consultar os provedores agora. Use a busca pronta abaixo ou tente novamente em alguns segundos.'
                : result.message || 'Nenhum vídeo confiável encontrado para essa expressão.'}
          </p>
          <strong>"{lastQuery}"</strong>
          <div className="suggestion-tags">
            {badVideoIds.length > 0 && (result.videoIds || []).length > 0 && (
              <button type="button" onClick={restoreBadVideosForSearch}>
                Restaurar vídeos desta busca
              </button>
            )}
            {retryVariants.map((variant) => (
              <button key={variant} type="button" onClick={() => performSearch(variant)}>
                {variant}
              </button>
            ))}
          </div>
          <a className="secondary-link" href={fallbackUrl} rel="noopener noreferrer" target="_blank">
            Abrir busca exata no YouTube Shorts
          </a>
        </section>
      )}
<details className="native-disclosure"><summary>Explorar situações e expressões</summary>      <section className="native-section">
        <div className="panel-heading">
          <div>
            <p className="kicker">Situações reais</p>
            <h2>Escolha onde você quer falar melhor</h2>
          </div>
          <span>{selectedSituationData.title}</span>
        </div>
        <div className="native-situation-grid">
          {nativeSituations.map((situation) => (
            <button
              className={selectedSituation === situation.id ? 'active' : ''}
              key={situation.id}
              type="button"
              onClick={() => setSelectedSituation(situation.id)}
            >
              <span>{situation.icon}</span>
              <strong>{situation.title}</strong>
              <small>{situation.copy}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="native-pack-row" aria-label="Pacotes prontos">
        {nativePacks.map((pack) => (
          <button key={pack.id} type="button" onClick={() => setSelectedSituation(pack.situation)}>
            <span>Pacote</span>
            <strong>{pack.title}</strong>
            <small>{pack.copy}</small>
          </button>
        ))}
      </section>

        <div className="native-library">
          <div className="panel-heading">
            <div>
              <p className="kicker">Como um nativo diria</p>
              <h2>{selectedSituationData.title}</h2>
            </div>
            <span>{recommendedPhrases.length} frases</span>
          </div>
          <div className="native-phrase-list">
            {recommendedPhrases.map((phrase) => (
              <button
                className={selectedPhrase.id === phrase.id ? 'active' : ''}
                key={phrase.id}
                type="button"
                onClick={() => {
                  setSelectedPhraseId(phrase.id);
                  setAnswer('');
                  setDictationAnswer('');
                  setCoachResult(null);
                  setCoachError('');
                  setShadowMessage('');
                  setDictationMessage('');
                  setProgressMessage('');
                }}
              >
                <span className="level-pill">{phrase.level}</span>
                <strong>{phrase.natural}</strong>
                <small>{completedNativePhrases.has(`native-phrase-${phrase.id}`) ? 'Treinada' : phrase.meaning}</small>
              </button>
            ))}
          </div>
        </div>

</details>
      <section className="native-workbench">
        <article className="native-practice-panel">
          <div className="native-compare">
            <div>
              <span>Frase traduzida</span>
              <strong>{selectedPhrase.casual}</strong>
            </div>
            <div>
              <span>Natural</span>
              <strong>{selectedPhrase.natural}</strong>
            </div>
          </div>

          <details className="native-disclosure"><summary>Quando usar e exemplos</summary>
          <div className="native-explain-grid">
            <div>
              <span>Quando usar</span>
              <p>{selectedPhrase.useWhen}</p>
            </div>
            <div>
              <span>Evite</span>
              <p>{selectedPhrase.avoidWhen}</p>
            </div>
            <div>
              <span>Exemplo</span>
              <p>{selectedPhrase.example}</p>
            </div>
          </div>

          </details>
          <div className="native-actions">
            <button type="button" onClick={() => speakText(selectedPhrase.natural)}>Ouvir pronúncia</button>
            <button type="button" onClick={() => toggleFavorite(selectedPhrase.id)}>
              {favorites.includes(selectedPhrase.id) ? 'Remover favorito' : 'Favoritar'}
            </button>
            <button type="button" onClick={() => performSearch(selectedPhrase.natural)}>Ver vídeo real</button>
          </div>

          <details className="native-disclosure native-practice-disclosure">
            <summary>Praticar: {selectedPhrase.natural}</summary>
            <div className="native-mode-switch" role="group" aria-label="Tipo de treino">
              {([{ id: 'shadow', label: 'Ouvir e repetir' }, { id: 'dictation', label: 'Ditado' }, { id: 'coach', label: 'Conversa com IA' }] as const).map(mode => (
                <button key={mode.id} type="button" aria-pressed={practiceMode === mode.id} onClick={() => setPracticeMode(mode.id)}>{mode.label}</button>
              ))}
            </div>
          <section className="native-drill-grid" aria-label="Treinos rápidos">
            <article hidden={practiceMode !== 'shadow'}>
              <span>Modo sombra</span>
              <strong>{selectedPhrase.natural}</strong>
              <p>Ouça, pause e repita junto tentando copiar ritmo e entonação.</p>
              <div>
                <button type="button" onClick={() => speakText(selectedPhrase.natural, 0.68)}>Lento</button>
                <button type="button" onClick={() => speakText(selectedPhrase.natural, 0.9)}>Natural</button>
                <button type="button" onClick={() => completeShadowPractice(3)}>Concluir</button>
              </div>
              {shadowMessage && <small>{shadowMessage}</small>}
            </article>

            <article hidden={practiceMode !== 'dictation'}>
              <span>Ditado</span>
              <strong>Escreva o que ouviu</strong>
              <p>Toque o áudio, escreva a frase e compare com o inglês natural.</p>
              <input
                className="field"
                placeholder="Digite a frase ouvida..."
                value={dictationAnswer}
                onChange={(event) => { setDictationAnswer(event.target.value); setDictationAttempt(crypto.randomUUID()); }}
              />
              <div>
                <button type="button" onClick={() => speakText(selectedPhrase.natural)}>Tocar áudio</button>
                <button type="button" onClick={checkDictation}>Corrigir ditado</button>
              </div>
              {dictationMessage && <small>{dictationMessage}</small>}
            </article>
          </section>

          <form hidden={practiceMode !== 'coach'} className="native-coach" onSubmit={handleCoachSubmit}>
            <label htmlFor="native-answer">Treino com IA</label>
            <p>{selectedPhrase.prompt}</p>
            {coachHistory.length > 0 && (
              <div className="native-coach-history" ref={coachHistoryRef} role="log" aria-label="Conversa do treino">
                {coachHistory.map((turn, index) => (
                  <div className="native-coach-turn" key={index}>
                    <p><strong>Você:</strong> {turn.answer}</p>
                    <p><strong>Nativo:</strong> {turn.reply}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea
              id="native-answer"
              maxLength={1000}
              disabled={isCoaching}
              aria-describedby="native-answer-count"
              placeholder="Escreva sua resposta em inglês..."
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            <small id="native-answer-count">{answer.length}/1000 caracteres</small>
            {coachError && <div className="form-error" role="alert">{coachError}</div>}
            <button className="primary-button" disabled={isCoaching || !answer.trim()} type="submit">
              {isCoaching ? 'Respondendo...' : coachError ? 'Tentar novamente' : coachHistory.length ? 'Enviar resposta' : 'Avaliar naturalidade'}
            </button>
            {(coachHistory.length > 0 || isCoaching) && (
              <button type="button" className="secondary-button" onClick={resetCoach}>Recomeçar treino</button>
            )}
          </form>

          {practiceMode === 'coach' && coachResult && (
            <section className="native-score-card">
              <div className="panel-heading">
                <h3>{coachResult.score}/100</h3>
                <span>naturalidade</span>
              </div>
              <div className="native-score-track">
                <span style={{ width: `${Math.max(0, Math.min(100, coachResult.score))}%` }} />
              </div>
              <p><strong>Correção:</strong> {coachResult.correction}</p>
              <p><strong>Mais natural:</strong> {coachResult.natural}</p>
              <details className="native-disclosure"><summary>Entender a correção</summary><p>{coachResult.feedback}</p></details>
              <button className="primary-button" disabled={isSavingProgress} type="button" onClick={saveNativeProgress}>
                {isSavingProgress ? 'Salvando...' : savedCurrentPhrase ? 'Salvar treino repetido' : 'Salvar progresso'}
              </button>
              {progressMessage && <div className="form-success">{progressMessage}</div>}
            </section>
          )}
          </details>
        </article>
      </section>

      <details className="native-disclosure"><summary>Minha biblioteca e histórico</summary>
      {favoritePhrases.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <h2>Favoritos</h2>
            <span>{favoritePhrases.length}</span>
          </div>
          <div className="native-favorites">
            {favoritePhrases.map((phrase) => (
              <button
                key={phrase.id}
                type="button"
                onClick={() => {
                  setSelectedSituation(phrase.situation);
                  setSelectedPhraseId(phrase.id);
                }}
              >
                <span>{phrase.level}</span>
                <strong>{phrase.natural}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      {recommendedReviewPhrases.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Revisão diária</p>
              <h2>Recomendadas para hoje</h2>
            </div>
            <span>{recommendedReviewPhrases.length}</span>
          </div>
          <div className="native-review-grid">
            {recommendedReviewPhrases.map((phrase) => (
              <button
                key={phrase.id}
                type="button"
                onClick={() => {
                  setSelectedSituation(phrase.situation);
                  setSelectedPhraseId(phrase.id);
                  setAnswer('');
                  setDictationAnswer('');
                  setCoachResult(null);
                  setCoachError('');
                  setShadowMessage('');
                  setDictationMessage('');
                  setProgressMessage('');
                }}
              >
                <span>{phrase.level}</span>
                <strong>{phrase.natural}</strong>
                <small>{phrase.meaning}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentHistory.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Histórico</p>
              <h2>Últimos treinos salvos</h2>
            </div>
            <span>{practiceHistory.length}</span>
          </div>
          <div className="native-history-list">
            {recentHistory.map((item) => {
              const situation = nativeSituations.find((nativeSituation) => nativeSituation.id === item.situation);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedSituation(item.situation);
                    setSelectedPhraseId(item.phraseId);
                    setProgressMessage('');
                  }}
                >
                  <span>{item.score}/100</span>
                  <strong>{item.natural}</strong>
                  <small>{situation?.title || 'Nativos'} · {item.level} · +{item.xp} XP</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {recentSearches.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Recentes</p>
              <h2>Buscas anteriores</h2>
            </div>
            <span>{searchHistory.length}</span>
          </div>
          <div className="native-search-history">
            {recentSearches.map((item) => (
              <button
                key={`${item.lang}-${item.query}`}
                type="button"
                onClick={() => {
                  setLang(item.lang);
                  performSearch(item.query, item.lang);
                }}
              >
                <strong>{item.query}</strong>
                <small>{item.lang}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentSavedVideos.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Biblioteca</p>
              <h2>Vídeos salvos</h2>
            </div>
            <span>{savedVideos.length}</span>
          </div>
          <div className="native-saved-videos">
            {recentSavedVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => {
                  setLastQuery(video.query);
                  setQuery(video.query);
                  setLang(video.lang);
                  setResult({
                    videoIds: [video.id],
                    cached: true,
                    message: 'Vídeo salvo'
                  });
                  setActiveVideo(video.id);
                }}
              >
                <img alt="" src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} />
                <span>{video.lang}</span>
                <strong>{video.query}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      </details>
    </section>
  );
}
