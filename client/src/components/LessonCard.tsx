import type { LessonSet } from '../data/lessons';
export function LessonCard({ lesson, active, completed, perfect, onSelect }: {
  lesson: LessonSet; active: boolean; completed: boolean; perfect: boolean; onSelect: () => void;
}) {
  return <button className={`lesson-card${active ? ' active' : ''}${completed ? ' completed' : ''}`} type="button" onClick={onSelect}>
    <div className="lesson-card-meta"><span>{lesson.level}</span>
      {perfect ? <em>Perfeita</em> : completed ? <em>Concluída</em> : null}
    </div>
    <strong>{lesson.title}</strong><small>{lesson.focus}</small>
  </button>;
}
