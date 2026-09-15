import { useActivityState } from '../hooks/activity-progress';
import { useMemo, useState } from 'react';
import { createPlacementQuestions, levelResults, PLACEMENT_TEST_SIZE, resolvePlacementLevel, type PlacementLevel } from '../data/placement';
import { updateProfile } from '../services/profile';
import { type UserProfile } from '../services/auth';

type PlacementTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
  onContinue?: () => void;
  required?: boolean;
};

export function PlacementTab({ user, onProfileRefresh, onContinue, required = false }: PlacementTabProps) {
  const [started, setStarted] = useActivityState('placement', 'started', required);
  const [index, setIndex] = useActivityState('placement', 'index', 0);
  const [correct, setCorrect] = useActivityState('placement', 'correct', 0);
  const [selected, setSelected] = useActivityState<number | null>('placement', 'selected', null);
  const [result, setResult] = useActivityState<PlacementLevel | null>('placement', 'result', null);
  const [isSaving, setIsSaving] = useState(false);
  const [testQuestions, setTestQuestions] = useActivityState('placement', 'testQuestions', () => createPlacementQuestions());

  const question = testQuestions[index];
  const progress = useMemo(() => Math.round((index / testQuestions.length) * 100), [index, testQuestions.length]);

  function start() {
    setTestQuestions(createPlacementQuestions());
    setStarted(true);
    setIndex(0);
    setCorrect(0);
    setSelected(null);
    setResult(null);
  }

  function answer(choiceIndex: number) {
    if (selected !== null || !question) return;
    setSelected(choiceIndex);
    setCorrect(correct + (choiceIndex === question.correct ? 1 : 0));
  }

  const [saveError, setSaveError] = useState('');
  async function nextQuestion() {
    if (selected === null || isSaving) return;
    if (index + 1 < testQuestions.length) {
      setIndex(index + 1);
      setSelected(null);
      return;
    }
    const level = resolvePlacementLevel(Math.round((correct / testQuestions.length) * 100));
    setIsSaving(true);
    setSaveError('');
    try {
      await updateProfile({ english_level: level, placement_completed: 1 });
      onProfileRefresh({ ...user, english_level: level, placement_completed: 1 });
      setResult(level);
      setStarted(false);
    } catch { setSaveError('Não foi possível salvar o nível. Tente novamente.'); }
    finally { setIsSaving(false); }
  }

  if (result) {
    const info = levelResults[result];
    const score = Math.round((correct / testQuestions.length) * 100);
    return (
      <section className="placement-layout result" aria-label="Resultado do nivelamento">
        <p className="kicker">{required ? 'Nivelamento inicial concluído' : 'Resultado'}</p>
        <h1 style={{ color: info.color }}>{info.name}</h1>
        <p className="lead">{info.desc}</p>
        <div className="placement-score">
          <article>
            <span>{correct}</span>
            <strong>Acertos</strong>
          </article>
          <article>
            <span>{score}%</span>
            <strong>Score</strong>
          </article>
          <article>
            <span>{isSaving ? '...' : 'OK'}</span>
            <strong>Salvo</strong>
          </article>
        </div>
        <button className="primary-button" type="button" onClick={start}>
          Refazer teste
        </button>
        {onContinue && (
          <button className="secondary-button" type="button" onClick={onContinue}>
            Entrar na minha trilha
          </button>
        )}
      </section>
    );
  }

  if (!started) {
    return (
      <section className="placement-layout" aria-label="Teste de nivelamento">
        <p className="kicker">{required ? 'Primeiro acesso' : 'Nivelamento'}</p>
        <h1>Descubra seu nível de inglês</h1>
        <p className="lead">
          Responda {PLACEMENT_TEST_SIZE} perguntas rápidas. O resultado configura suas lições, músicas, flashcards e conversas.
        </p>
        <div className="placement-current">
          <span>{user.english_level || 'A1'}</span>
          <strong>Nível atual</strong>
        </div>
        <button className="primary-button" type="button" onClick={start}>
          Começar teste
        </button>
      </section>
    );
  }

  return (
    <section className="placement-layout active" aria-label="Pergunta de nivelamento">
      <div className="progress-track" aria-label={`Progresso ${progress}%`}>
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="placement-count">
        {index + 1}/{testQuestions.length}
      </div>
      <span className="placement-badge">{question.level}</span>
      <h1>{question.text}</h1>
      {question.hint && <p className="lead">{question.hint}</p>}
      <div className="placement-choices">
        {question.choices.map((choice, choiceIndex) => {
          const isSelected = selected === choiceIndex;
          const isCorrect = selected !== null && choiceIndex === question.correct;
          return (
            <button
              className={`${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''}`}
              disabled={selected !== null}
              key={choice}
              type="button"
              onClick={() => answer(choiceIndex)}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      <button className="primary-button" type="button" disabled={selected === null || isSaving} onClick={nextQuestion}>
        {isSaving ? 'Salvando…' : index + 1 === testQuestions.length ? 'Concluir teste' : 'Próxima pergunta'}
      </button>
    </section>
  );
}
