import { useEffect, useMemo, useState } from 'react';
import {
  APP_LEVELS,
  LEVEL_PROFILES,
  englishLevelDistance,
  isRecommendedEnglishLevel,
  normalizeEnglishLevel,
  sortByEnglishLevel
} from '../data/levels';
import { lessonSets, type LessonSet } from '../data/lessons';
import { updateProfile, type UserProfile } from '../services/auth';

type LessonTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

function resolveLevel(xp: number) {
  const reached = APP_LEVELS.filter((level) => xp >= level.xpNeeded).at(-1);
  return reached ? Math.min(reached.level + 1, APP_LEVELS.length) : 1;
}

function dailyQuestionSortKey(questionId: string, seed: string) {
  let hash = 0;
  const value = `${seed}-${questionId}`;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function LessonTab({ user, onProfileRefresh }: LessonTabProps) {
  const recommendedLessons = useMemo(() => sortByEnglishLevel(lessonSets, user.english_level), [user.english_level]);
  const [activeLesson, setActiveLesson] = useState<LessonSet>(recommendedLessons[0]);
  const [practiceMode, setPracticeMode] = useState<'quick' | 'complete'>('quick');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submittedTextAnswer, setSubmittedTextAnswer] = useState('');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [missedQuestions, setMissedQuestions] = useState<typeof activeLesson.questions>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedResult, setSavedResult] = useState('');

  const isReviewLesson = activeLesson.id.endsWith('-review');
  const sameLevelQuestions = useMemo(() => {
    const questionsById = new Map<string, LessonSet['questions'][number]>();

    activeLesson.questions.forEach((question) => questionsById.set(question.id, question));
    lessonSets
      .filter((lesson) => lesson.level === activeLesson.level && lesson.id !== activeLesson.id)
      .forEach((lesson) => {
        lesson.questions.forEach((question) => questionsById.set(question.id, question));
      });

    return Array.from(questionsById.values());
  }, [activeLesson]);
  const dailyQuestionPool = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = `${today}-${user.id}-${activeLesson.id}-${practiceMode}`;

    return [...sameLevelQuestions].sort(
      (first, second) => dailyQuestionSortKey(first.id, seed) - dailyQuestionSortKey(second.id, seed)
    );
  }, [activeLesson.id, practiceMode, sameLevelQuestions, user.id]);
  const currentQuestions = useMemo(
    () => {
      if (isReviewLesson) return activeLesson.questions;
      return dailyQuestionPool.slice(0, practiceMode === 'quick' ? 5 : 10);
    },
    [activeLesson, dailyQuestionPool, isReviewLesson, practiceMode]
  );
  const activeQuestion = currentQuestions[questionIndex];
  const isTypeQuestion = activeQuestion.prompt.startsWith('Complete:');
  const normalizedTypedAnswer = submittedTextAnswer.trim().toLowerCase();
  const normalizedCorrectAnswer = activeQuestion.choices[activeQuestion.answer].trim().toLowerCase();
  const isTypedCorrect = isTypeQuestion && normalizedTypedAnswer === normalizedCorrectAnswer;
  const correctCount = useMemo(() => answers.filter(Boolean).length, [answers]);
  const isAnswered = isTypeQuestion ? submittedTextAnswer !== '' : selectedChoice !== null;
  const isLastQuestion = questionIndex === currentQuestions.length - 1;
  const isComplete = answers.length === currentQuestions.length;
  const progress = Math.round((answers.length / currentQuestions.length) * 100);
  const modeXpBonus = practiceMode === 'complete' ? activeLesson.xp : Math.round(activeLesson.xp / 2);
  const earnedXp = correctCount * 12 + (correctCount === currentQuestions.length ? modeXpBonus : 0);
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const levelProfile = LEVEL_PROFILES[englishLevel];
  const recommendedLevelLessons = recommendedLessons.filter((lesson) => isRecommendedEnglishLevel(lesson.level, englishLevel));
  const supportLessons = recommendedLessons.filter((lesson) => englishLevelDistance(lesson.level, englishLevel) === 1);
  const freePracticeLessons = recommendedLessons.filter((lesson) => englishLevelDistance(lesson.level, englishLevel) > 1);
  const primaryLessons = recommendedLevelLessons.length ? recommendedLevelLessons : recommendedLessons.slice(0, 2);
  const practiceLessons = [...supportLessons, ...freePracticeLessons].filter(
    (lesson) => !primaryLessons.some((primary) => primary.id === lesson.id)
  );
  const completedLessons = useMemo(
    () => new Set((user.achievements || []).filter((achievement) => achievement.startsWith('lesson-'))),
    [user.achievements]
  );
  const perfectLessons = useMemo(
    () => new Set((user.achievements || []).filter((achievement) => achievement.startsWith('perfect-'))),
    [user.achievements]
  );
  const nextLesson = useMemo(() => {
    const unfinishedRecommended = primaryLessons.find((lesson) => !completedLessons.has(`lesson-${lesson.id}`));
    if (unfinishedRecommended) return unfinishedRecommended;
    return practiceLessons.find((lesson) => !completedLessons.has(`lesson-${lesson.id}`)) || primaryLessons[0];
  }, [completedLessons, practiceLessons, primaryLessons]);

  useEffect(() => {
    startLesson(recommendedLessons[0]);
  }, [recommendedLessons[0]?.id]);

  function startLesson(lesson: LessonSet) {
    setActiveLesson(lesson);
    setQuestionIndex(0);
    setSelectedChoice(null);
    setTypedAnswer('');
    setSubmittedTextAnswer('');
    setAnswers([]);
    setMissedQuestions([]);
    setSavedResult('');
  }

  function changePracticeMode(mode: 'quick' | 'complete') {
    setPracticeMode(mode);
    setQuestionIndex(0);
    setSelectedChoice(null);
    setTypedAnswer('');
    setSubmittedTextAnswer('');
    setAnswers([]);
    setMissedQuestions([]);
    setSavedResult('');
  }

  function chooseAnswer(choiceIndex: number) {
    if (isAnswered || isComplete) return;
    setSelectedChoice(choiceIndex);
  }

  function submitTypedAnswer() {
    if (!isTypeQuestion || isAnswered || isComplete || !typedAnswer.trim()) return;
    setSubmittedTextAnswer(typedAnswer);
  }

  function goNext() {
    if (!isAnswered || isComplete) return;

    const isCorrect = isTypeQuestion ? isTypedCorrect : selectedChoice === activeQuestion.answer;
    const nextAnswers = [...answers, isCorrect];
    setAnswers(nextAnswers);
    if (!isCorrect) {
      setMissedQuestions((current) =>
        current.some((question) => question.id === activeQuestion.id) ? current : [...current, activeQuestion]
      );
    }
    setSelectedChoice(null);
    setTypedAnswer('');
    setSubmittedTextAnswer('');

    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
    }
  }

  function startMistakeReview() {
    if (!missedQuestions.length) return;
    startLesson({
      id: `${activeLesson.id}-review`,
      title: 'Revisão de erros',
      level: activeLesson.level,
      focus: 'Treino rápido com as perguntas que você errou agora.',
      xp: Math.max(20, Math.round(activeLesson.xp / 3)),
      questions: missedQuestions
    });
  }

  async function saveProgress() {
    if (!isComplete || isSaving) return;

    const nextAchievements = new Set(user.achievements || []);
    const completedAchievement = `lesson-${activeLesson.id}`;
    const wasAlreadyCompleted = nextAchievements.has(completedAchievement);

    if (correctCount === currentQuestions.length) {
      nextAchievements.add(`perfect-${activeLesson.id}`);
    }
    nextAchievements.add(completedAchievement);

    const nextXp = Number(user.xp || 0) + earnedXp;
    const nextUser: UserProfile = {
      ...user,
      xp: nextXp,
      level: Math.max(Number(user.level || 1), resolveLevel(nextXp)),
      correct_answers: Number(user.correct_answers || 0) + correctCount,
      lessons_completed: Number(user.lessons_completed || 0) + (wasAlreadyCompleted ? 0 : 1),
      achievements: Array.from(nextAchievements)
    };

    try {
      setIsSaving(true);
      setSavedResult('');
      await updateProfile({
        xp: nextUser.xp,
        level: nextUser.level,
        correct_answers: nextUser.correct_answers,
        lessons_completed: nextUser.lessons_completed,
        achievements: nextUser.achievements
      });
      onProfileRefresh(nextUser);
      setSavedResult(wasAlreadyCompleted ? 'Treino repetido salvo.' : 'Progresso salvo.');
    } catch (error) {
      setSavedResult(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="lesson-layout">
      <div className="lesson-sidebar">
        <span className="section-kicker">Trilha de prática</span>
        <h1>Lições rápidas para ganhar XP</h1>
        <p className="lead">Seu nível atual é {englishLevel}: {levelProfile.practice}</p>

        {nextLesson && (
          <button className="lesson-next-card" type="button" onClick={() => startLesson(nextLesson)}>
            <span>Comece por aqui</span>
            <strong>{nextLesson.title}</strong>
            <small>
              {completedLessons.has(`lesson-${nextLesson.id}`)
                ? 'Você já concluiu as principais. Repetir esta lição reforça o conteúdo.'
                : `Melhor próximo treino para o seu nível ${englishLevel}.`}
            </small>
          </button>
        )}

        <span className="section-kicker secondary-kicker">Recomendadas para você</span>
        <div className="lesson-grid">
          {primaryLessons.map((lesson) => (
            <button
              className={`${activeLesson.id === lesson.id ? 'lesson-card active' : 'lesson-card'} ${
                completedLessons.has(`lesson-${lesson.id}`) ? 'completed' : ''
              }`.trim()}
              key={lesson.id}
              type="button"
              onClick={() => startLesson(lesson)}
            >
              <div className="lesson-card-meta">
                <span>{lesson.level}</span>
                {perfectLessons.has(`perfect-${lesson.id}`) ? <em>Perfeita</em> : completedLessons.has(`lesson-${lesson.id}`) ? <em>Concluída</em> : null}
              </div>
              <strong>{lesson.title}</strong>
              <small>{lesson.focus}</small>
            </button>
          ))}
        </div>
        {practiceLessons.length > 0 && (
          <>
            <span className="section-kicker secondary-kicker">Também liberadas</span>
            <div className="lesson-grid compact">
              {practiceLessons.map((lesson) => (
                <button
                  className={`${activeLesson.id === lesson.id ? 'lesson-card active' : 'lesson-card'} ${
                    completedLessons.has(`lesson-${lesson.id}`) ? 'completed' : ''
                  }`.trim()}
                  key={lesson.id}
                  type="button"
                  onClick={() => startLesson(lesson)}
                >
                  <div className="lesson-card-meta">
                    <span>{lesson.level}</span>
                    {perfectLessons.has(`perfect-${lesson.id}`) ? <em>Perfeita</em> : completedLessons.has(`lesson-${lesson.id}`) ? <em>Concluída</em> : null}
                  </div>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.focus}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="lesson-runner">
        <div className="lesson-mode-switch" aria-label="Modo de treino">
          <button className={practiceMode === 'quick' ? 'active' : ''} type="button" onClick={() => changePracticeMode('quick')}>
            Rápido · 5
          </button>
          <button className={practiceMode === 'complete' ? 'active' : ''} type="button" onClick={() => changePracticeMode('complete')}>
            Completo · 10
          </button>
        </div>

        <div className="lesson-runner-head">
          <div>
            <span className="section-kicker">{activeLesson.level}</span>
            <h2>{activeLesson.title}</h2>
          </div>
          <strong>{answers.length}/{currentQuestions.length}</strong>
        </div>

        <div className="progress-track" aria-label="Progresso da lição">
          <div style={{ width: `${progress}%` }} />
        </div>

        {!isComplete ? (
          <>
            <article className="lesson-briefing">
              <span>Antes de responder</span>
              <p>{activeQuestion.helper}</p>
            </article>

            <article className="lesson-question">
              <span>{activeLesson.focus}</span>
              <h3>{activeQuestion.prompt}</h3>
            </article>

            {isTypeQuestion ? (
              <div className="lesson-type-answer">
                <input
                  aria-label="Digite a resposta"
                  disabled={isAnswered}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitTypedAnswer();
                    }
                  }}
                  placeholder="Digite a palavra que completa a frase"
                  value={typedAnswer}
                />
              </div>
            ) : (
              <div className="lesson-choices">
                {activeQuestion.choices.map((choice, index) => {
                  const isCorrect = isAnswered && index === activeQuestion.answer;
                  const isWrong = isAnswered && selectedChoice === index && index !== activeQuestion.answer;
                  return (
                    <button
                      className={`${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`.trim()}
                      key={choice}
                      type="button"
                      onClick={() => chooseAnswer(index)}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            )}

            {isAnswered && (
              <div className={(isTypeQuestion ? isTypedCorrect : selectedChoice === activeQuestion.answer) ? 'lesson-feedback correct' : 'lesson-feedback wrong'}>
                <strong>{(isTypeQuestion ? isTypedCorrect : selectedChoice === activeQuestion.answer) ? 'Resposta certa' : 'Quase'}</strong>
                {(isTypeQuestion ? !isTypedCorrect : selectedChoice !== activeQuestion.answer) && (
                  <span>
                    Correta: <b>{activeQuestion.choices[activeQuestion.answer]}</b>
                  </span>
                )}
                <span>{activeQuestion.explain}</span>
              </div>
            )}

            <button
              className="primary-button"
              type="button"
              disabled={isTypeQuestion ? !typedAnswer.trim() && !isAnswered : !isAnswered}
              onClick={isTypeQuestion && !isAnswered ? submitTypedAnswer : goNext}
            >
              {isTypeQuestion && !isAnswered ? 'Conferir' : isLastQuestion ? 'Ver resultado' : 'Próxima'}
            </button>
          </>
        ) : (
          <div className="lesson-result">
            <span>{correctCount}/{currentQuestions.length}</span>
            <h2>{correctCount === currentQuestions.length ? 'Sequência perfeita' : 'Lição concluída'}</h2>
            <p>{earnedXp} XP ganhos nesta prática.</p>
            {savedResult && (
              <div className={savedResult.includes('salvo') ? 'form-success' : 'form-error'}>{savedResult}</div>
            )}
            <div className="lesson-actions">
              <button className="primary-button" type="button" disabled={isSaving} onClick={saveProgress}>
                {isSaving ? 'Salvando...' : 'Salvar progresso'}
              </button>
              <button className="secondary-button" type="button" onClick={() => startLesson(activeLesson)}>
                Repetir lição
              </button>
              {missedQuestions.length > 0 && (
                <button className="secondary-button" type="button" onClick={startMistakeReview}>
                  Revisar erros
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
