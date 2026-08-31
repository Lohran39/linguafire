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

export function LessonTab({ user, onProfileRefresh }: LessonTabProps) {
  const recommendedLessons = useMemo(() => sortByEnglishLevel(lessonSets, user.english_level), [user.english_level]);
  const [activeLesson, setActiveLesson] = useState<LessonSet>(recommendedLessons[0]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedResult, setSavedResult] = useState('');

  const activeQuestion = activeLesson.questions[questionIndex];
  const correctCount = useMemo(() => answers.filter(Boolean).length, [answers]);
  const isAnswered = selectedChoice !== null;
  const isLastQuestion = questionIndex === activeLesson.questions.length - 1;
  const isComplete = answers.length === activeLesson.questions.length;
  const progress = Math.round((answers.length / activeLesson.questions.length) * 100);
  const earnedXp = correctCount * 12 + (correctCount === activeLesson.questions.length ? activeLesson.xp : 0);
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const levelProfile = LEVEL_PROFILES[englishLevel];
  const recommendedLevelLessons = recommendedLessons.filter((lesson) => isRecommendedEnglishLevel(lesson.level, englishLevel));
  const supportLessons = recommendedLessons.filter((lesson) => englishLevelDistance(lesson.level, englishLevel) === 1);
  const freePracticeLessons = recommendedLessons.filter((lesson) => englishLevelDistance(lesson.level, englishLevel) > 1);
  const primaryLessons = recommendedLevelLessons.length ? recommendedLevelLessons : recommendedLessons.slice(0, 2);
  const practiceLessons = [...supportLessons, ...freePracticeLessons].filter(
    (lesson) => !primaryLessons.some((primary) => primary.id === lesson.id)
  );

  useEffect(() => {
    startLesson(recommendedLessons[0]);
  }, [recommendedLessons[0]?.id]);

  function startLesson(lesson: LessonSet) {
    setActiveLesson(lesson);
    setQuestionIndex(0);
    setSelectedChoice(null);
    setAnswers([]);
    setSavedResult('');
  }

  function chooseAnswer(choiceIndex: number) {
    if (isAnswered || isComplete) return;
    setSelectedChoice(choiceIndex);
  }

  function goNext() {
    if (selectedChoice === null || isComplete) return;

    const nextAnswers = [...answers, selectedChoice === activeQuestion.answer];
    setAnswers(nextAnswers);
    setSelectedChoice(null);

    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
    }
  }

  async function saveProgress() {
    if (!isComplete) return;

    const nextAchievements = new Set(user.achievements || []);
    if (correctCount === activeLesson.questions.length) {
      nextAchievements.add(`perfect-${activeLesson.id}`);
    }
    nextAchievements.add(`lesson-${activeLesson.id}`);

    const nextXp = Number(user.xp || 0) + earnedXp;
    const nextUser: UserProfile = {
      ...user,
      xp: nextXp,
      level: Math.max(Number(user.level || 1), resolveLevel(nextXp)),
      correct_answers: Number(user.correct_answers || 0) + correctCount,
      lessons_completed: Number(user.lessons_completed || 0) + 1,
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
      setSavedResult('Progresso salvo.');
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

        <span className="section-kicker secondary-kicker">Recomendadas para você</span>
        <div className="lesson-grid">
          {primaryLessons.map((lesson) => (
            <button
              className={activeLesson.id === lesson.id ? 'lesson-card active' : 'lesson-card'}
              key={lesson.id}
              type="button"
              onClick={() => startLesson(lesson)}
            >
              <span>{lesson.level}</span>
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
                  className={activeLesson.id === lesson.id ? 'lesson-card active' : 'lesson-card'}
                  key={lesson.id}
                  type="button"
                  onClick={() => startLesson(lesson)}
                >
                  <span>{lesson.level}</span>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.focus}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="lesson-runner">
        <div className="lesson-runner-head">
          <div>
            <span className="section-kicker">{activeLesson.level}</span>
            <h2>{activeLesson.title}</h2>
          </div>
          <strong>{answers.length}/{activeLesson.questions.length}</strong>
        </div>

        <div className="progress-track" aria-label="Progresso da lição">
          <div style={{ width: `${progress}%` }} />
        </div>

        {!isComplete ? (
          <>
            <article className="lesson-question">
              <span>{activeQuestion.helper}</span>
              <h3>{activeQuestion.prompt}</h3>
            </article>

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

            {isAnswered && (
              <div className={selectedChoice === activeQuestion.answer ? 'lesson-feedback correct' : 'lesson-feedback wrong'}>
                <strong>{selectedChoice === activeQuestion.answer ? 'Resposta certa' : 'Quase'}</strong>
                <span>{activeQuestion.explain}</span>
              </div>
            )}

            <button className="primary-button" type="button" disabled={!isAnswered} onClick={goNext}>
              {isLastQuestion ? 'Ver resultado' : 'Próxima'}
            </button>
          </>
        ) : (
          <div className="lesson-result">
            <span>{correctCount}/{activeLesson.questions.length}</span>
            <h2>{correctCount === activeLesson.questions.length ? 'Sequência perfeita' : 'Lição concluída'}</h2>
            <p>{earnedXp} XP ganhos nesta prática.</p>
            {savedResult && <div className={savedResult === 'Progresso salvo.' ? 'form-success' : 'form-error'}>{savedResult}</div>}
            <div className="lesson-actions">
              <button className="primary-button" type="button" disabled={isSaving} onClick={saveProgress}>
                {isSaving ? 'Salvando...' : 'Salvar progresso'}
              </button>
              <button className="secondary-button" type="button" onClick={() => startLesson(activeLesson)}>
                Repetir lição
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
