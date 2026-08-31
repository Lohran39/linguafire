import { useEffect, useMemo, useState } from 'react';
import { getAvailableFlashcards, getFlashcardStats, reviewFlashcard, type Flashcard, type FlashcardStats } from '../services/flashcards';
import { updateProfile, type UserProfile } from '../services/auth';
import { normalizeEnglishLevel, sortByEnglishLevel } from '../data/levels';

type FlashcardTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

type FlashMode = 'en-pt' | 'pt-en' | 'complete' | 'listen';

const qualityOptions = [
  { value: 1, label: 'Errei', copy: 'Rever logo' },
  { value: 3, label: 'Difícil', copy: 'Ainda fraco' },
  { value: 4, label: 'Bom', copy: 'Quase fixou' },
  { value: 5, label: 'Fácil', copy: 'Dominado' }
];

const flashModes: Array<{ value: FlashMode; label: string; copy: string }> = [
  { value: 'en-pt', label: 'EN → PT', copy: 'Lembrar significado' },
  { value: 'pt-en', label: 'PT → EN', copy: 'Produzir em inglês' },
  { value: 'complete', label: 'Frase', copy: 'Completar contexto' },
  { value: 'listen', label: 'Ouvir', copy: 'Treinar pronúncia' }
];

const categoryOptions = ['Todas', 'Rotina', 'Viagem', 'Trabalho', 'Conversas', 'Phrasal verb', 'Estudo'];
const dailyGoal = 10;

function getDailyFlashKey(userId: string) {
  return `linguafire:flash-daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
}

function buildPrompt(card: Flashcard, mode: FlashMode) {
  if (mode === 'pt-en') return card.translation || 'Sem tradução';
  if (mode === 'complete' && card.example) {
    const escaped = card.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return card.example.replace(new RegExp(escaped, 'i'), '_____');
  }
  if (mode === 'listen') return 'Ouça e tente lembrar a palavra';
  return card.word;
}

function buildAnswer(card: Flashcard, mode: FlashMode) {
  if (mode === 'pt-en') return card.word;
  if (mode === 'complete') return card.example || card.word;
  return card.translation || 'Sem tradução';
}

function getSpeakText(card: Flashcard, mode: FlashMode) {
  if (mode === 'complete') return card.example || card.word;
  return card.word;
}

export function FlashcardTab({ user, onProfileRefresh }: FlashcardTabProps) {
  const [stats, setStats] = useState<FlashcardStats>({ due: 0, total: 0 });
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [sessionSize, setSessionSize] = useState<10 | 20>(10);
  const [mode, setMode] = useState<FlashMode>('en-pt');
  const [category, setCategory] = useState('Todas');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [notice, setNotice] = useState('');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [dailyReviewed, setDailyReviewed] = useState(0);
  const [missedCards, setMissedCards] = useState<Flashcard[]>([]);
  const englishLevel = normalizeEnglishLevel(user.english_level);

  const currentCard = cards[index] || null;
  const sessionDone = cards.length > 0 && index >= cards.length;
  const currentPrompt = currentCard ? buildPrompt(currentCard, mode) : '';
  const dailyProgress = Math.min(100, Math.round((dailyReviewed / dailyGoal) * 100));
  const progress = useMemo(() => {
    if (!cards.length) return 0;
    return Math.min(100, Math.round((index / cards.length) * 100));
  }, [cards.length, index]);

  async function loadStats() {
    try {
      setStats(await getFlashcardStats());
    } catch {
      setStats({ due: 0, total: 0 });
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function boot() {
      setIsLoading(true);
      try {
        const nextStats = await getFlashcardStats();
        if (isMounted) setStats(nextStats);
      } catch {
        if (isMounted) setNotice('Não foi possível carregar estatísticas agora.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    boot();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(getDailyFlashKey(user.id));
    setDailyReviewed(saved ? Number(saved) || 0 : 0);
  }, [user.id]);

  async function startSession() {
    setNotice('');
    setIsLoading(true);

    try {
      const available = sortByEnglishLevel(await getAvailableFlashcards(), englishLevel);
      const filtered = category === 'Todas' ? available : available.filter((card) => card.category === category);
      const nextCards = filtered.length ? filtered : available;
      setCards(nextCards.slice(0, sessionSize));
      setIndex(0);
      setRevealed(false);
      setSessionCorrect(0);
      setSessionXp(0);
      setMissedCards([]);
      if (!nextCards.length) {
        setNotice('Nenhum card para revisar agora.');
      } else if (category !== 'Todas' && !filtered.length) {
        setNotice('Essa categoria não tem cards agora. Abrimos uma sessão geral para você.');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao iniciar revisão.');
    } finally {
      setIsLoading(false);
    }
  }

  async function submitQuality(quality: number) {
    if (!currentCard || isReviewing) return;

    setIsReviewing(true);
    setNotice('');

    try {
      const result = await reviewFlashcard(currentCard, quality);
      const gainedXp = quality >= 3 ? 5 : 2;
      const gainedCorrect = quality >= 3 ? 1 : 0;
      const nextUser = {
        ...user,
        xp: Number(user.xp || 0) + gainedXp,
        correct_answers: Number(user.correct_answers || 0) + gainedCorrect
      };
      await updateProfile({ xp: nextUser.xp, correct_answers: nextUser.correct_answers });
      onProfileRefresh(nextUser);
      setSessionXp((value) => value + gainedXp);
      setSessionCorrect((value) => value + gainedCorrect);
      if (quality < 3) {
        setMissedCards((value) => [...value, currentCard]);
      }
      setDailyReviewed((value) => {
        const nextValue = value + 1;
        window.localStorage.setItem(getDailyFlashKey(user.id), String(nextValue));
        return nextValue;
      });
      setNotice(`Próxima revisão em ${result.interval} dia(s). +${gainedXp} XP`);
      setIndex((value) => value + 1);
      setRevealed(false);
      await loadStats();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Erro ao salvar revisão.');
    } finally {
      setIsReviewing(false);
    }
  }

  function resetSession() {
    setCards([]);
    setIndex(0);
    setRevealed(false);
    setNotice('');
    loadStats();
  }

  function reviewMissedCards() {
    if (!missedCards.length) return;
    setCards(missedCards);
    setIndex(0);
    setRevealed(false);
    setNotice('');
    setSessionCorrect(0);
    setSessionXp(0);
    setMissedCards([]);
  }

  function changeSessionSize(size: 10 | 20) {
    setSessionSize(size);
    setCards([]);
    setIndex(0);
    setRevealed(false);
    setNotice('');
    setSessionCorrect(0);
    setSessionXp(0);
    setMissedCards([]);
  }

  function speakCard(card: Flashcard) {
    if (!('speechSynthesis' in window)) {
      setNotice('Seu navegador não liberou áudio de pronúncia agora.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(getSpeakText(card, mode));
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <section className="flash-layout" aria-label="Flashcards">
      <aside className="flash-side">
        <section className="side-panel">
          <div className="panel-heading">
            <h2>Revisão espaçada</h2>
            <span>{englishLevel}</span>
          </div>
          <div className="flash-mode-switch" aria-label="Tamanho da sessão">
            <button className={sessionSize === 10 ? 'active' : ''} type="button" onClick={() => changeSessionSize(10)}>
              Essencial · 10
            </button>
            <button className={sessionSize === 20 ? 'active' : ''} type="button" onClick={() => changeSessionSize(20)}>
              Completa · 20
            </button>
          </div>
          <div className="flash-filter">
            <label htmlFor="flash-category">Categoria</label>
            <select id="flash-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flash-stats">
            <article>
              <span>{isLoading ? '...' : stats.due}</span>
              <strong>Para revisar</strong>
            </article>
            <article>
              <span>{isLoading ? '...' : stats.total}</span>
              <strong>Total salvo</strong>
            </article>
          </div>
          <button className="primary-button" type="button" onClick={startSession} disabled={isLoading}>
            {cards.length ? 'Reiniciar sessão' : 'Começar revisão'}
          </button>
        </section>

        <section className="side-panel">
          <div className="panel-heading">
            <h2>Modo</h2>
            <span>{mode.toUpperCase()}</span>
          </div>
          <div className="flash-mode-grid">
            {flashModes.map((item) => (
              <button
                className={mode === item.value ? 'active' : ''}
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value);
                  setRevealed(false);
                }}
              >
                <strong>{item.label}</strong>
                <span>{item.copy}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="side-panel">
          <div className="panel-heading">
            <h2>Sessão</h2>
            <span>{cards.length ? `${Math.min(index, cards.length)}/${cards.length}` : '0/0'}</span>
          </div>
          <div className="flash-stats">
            <article>
              <span>{sessionCorrect}</span>
              <strong>Acertos</strong>
            </article>
            <article>
              <span>{sessionXp}</span>
              <strong>XP ganho</strong>
            </article>
          </div>
          <div className="daily-goal">
            <div>
              <strong>Meta diária</strong>
              <span>{Math.min(dailyReviewed, dailyGoal)}/{dailyGoal}</span>
            </div>
            <div className="progress-track" aria-label={`Meta diária ${dailyProgress}%`}>
              <div style={{ width: `${dailyProgress}%` }} />
            </div>
          </div>
        </section>
      </aside>

      <main className="flash-main">
        <div className="progress-track" aria-label={`Progresso ${progress}%`}>
          <div style={{ width: `${progress}%` }} />
        </div>

        {!cards.length && (
          <section className="flash-card empty">
            <p className="kicker">Flashcards</p>
            <h1>Treine vocabulário em ciclos curtos</h1>
            <p className="lead">
              A sessão prioriza palavras do seu nível, mistura revisões vencidas com cards novos e muda a ordem todos os dias.
            </p>
            <div className="flash-empty-hints">
              <span>Escolha um modo</span>
              <span>Ouça a pronúncia</span>
              <span>Revise seus erros</span>
            </div>
            <button className="primary-button" type="button" onClick={startSession} disabled={isLoading}>
              Começar agora
            </button>
          </section>
        )}

        {currentCard && !sessionDone && (
          <section className="flash-card">
            <div className="flash-card-top">
              <span>{currentCard.level || 'Livre'}</span>
              {currentCard.category && <span>{currentCard.category}</span>}
              {currentCard.isNew && <strong>Novo</strong>}
            </div>
            <h1 className={currentPrompt.length > 24 ? 'compact' : ''}>{currentPrompt}</h1>
            <button className="audio-button" type="button" onClick={() => speakCard(currentCard)}>
              Ouvir pronúncia
            </button>
            {revealed ? (
              <>
                <p className="translation">{buildAnswer(currentCard, mode)}</p>
                {currentCard.example && <p className="flash-example">{currentCard.example}</p>}
                {currentCard.note && <p className="flash-note">{currentCard.note}</p>}
                <div className="quality-grid">
                  {qualityOptions.map((option) => (
                    <button
                      disabled={isReviewing}
                      key={option.value}
                      type="button"
                      onClick={() => submitQuality(option.value)}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.copy}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button className="primary-button" type="button" onClick={() => setRevealed(true)}>
                Revelar resposta
              </button>
            )}
          </section>
        )}

        {sessionDone && (
          <section className="flash-card empty">
            <p className="kicker">Sessão concluída</p>
            <h1>{sessionCorrect} acertos</h1>
            <p className="lead">
              Você revisou {cards.length} cards e ganhou {sessionXp} XP. Amanhã a fila muda para trazer outra combinação.
            </p>
            <div className="flash-summary">
              <span>{missedCards.length} para reforçar</span>
              <span>{Math.min(dailyReviewed, dailyGoal)}/{dailyGoal} da meta diária</span>
            </div>
            <div className="flash-actions">
              {missedCards.length > 0 && (
                <button className="secondary-button" type="button" onClick={reviewMissedCards}>
                  Revisar erros
                </button>
              )}
              <button className="primary-button" type="button" onClick={resetSession}>
                Voltar
              </button>
            </div>
          </section>
        )}

        {notice && <div className="form-success">{notice}</div>}
      </main>
    </section>
  );
}
