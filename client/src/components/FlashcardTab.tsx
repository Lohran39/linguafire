import { useEffect, useMemo, useState } from 'react';
import { getAvailableFlashcards, getFlashcardStats, reviewFlashcard, type Flashcard, type FlashcardStats } from '../services/flashcards';
import { updateProfile, type UserProfile } from '../services/auth';
import { normalizeEnglishLevel, sortByEnglishLevel } from '../data/levels';

type FlashcardTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

const qualityOptions = [
  { value: 1, label: 'Errei', copy: 'Rever logo' },
  { value: 3, label: 'Difícil', copy: 'Ainda fraco' },
  { value: 4, label: 'Bom', copy: 'Quase fixou' },
  { value: 5, label: 'Fácil', copy: 'Dominado' }
];

export function FlashcardTab({ user, onProfileRefresh }: FlashcardTabProps) {
  const [stats, setStats] = useState<FlashcardStats>({ due: 0, total: 0 });
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [sessionSize, setSessionSize] = useState<10 | 20>(10);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [notice, setNotice] = useState('');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const englishLevel = normalizeEnglishLevel(user.english_level);

  const currentCard = cards[index] || null;
  const sessionDone = cards.length > 0 && index >= cards.length;
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

  async function startSession() {
    setNotice('');
    setIsLoading(true);

    try {
      const available = sortByEnglishLevel(await getAvailableFlashcards(), englishLevel);
      setCards(available.slice(0, sessionSize));
      setIndex(0);
      setRevealed(false);
      setSessionCorrect(0);
      setSessionXp(0);
      if (!available.length) {
        setNotice('Nenhum card para revisar agora.');
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

  function changeSessionSize(size: 10 | 20) {
    setSessionSize(size);
    setCards([]);
    setIndex(0);
    setRevealed(false);
    setNotice('');
    setSessionCorrect(0);
    setSessionXp(0);
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
            <h1>{currentCard.word}</h1>
            {revealed ? (
              <>
                <p className="translation">{currentCard.translation || 'Sem tradução'}</p>
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
            <button className="primary-button" type="button" onClick={resetSession}>
              Voltar
            </button>
          </section>
        )}

        {notice && <div className="form-success">{notice}</div>}
      </main>
    </section>
  );
}
