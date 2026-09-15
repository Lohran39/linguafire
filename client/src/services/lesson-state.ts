import type { LessonQuestion, LessonSet } from '../data/lessons';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function isLessonQuestion(value: unknown): value is LessonQuestion {
  return record(value) && ['id', 'prompt', 'helper', 'explain'].every(key => typeof value[key] === 'string')
    && Array.isArray(value.choices) && value.choices.length > 0 && value.choices.every(choice => typeof choice === 'string')
    && Number.isInteger(value.answer) && Number(value.answer) >= 0 && Number(value.answer) < value.choices.length;
}

export function isLessonSet(value: unknown): value is LessonSet {
  return record(value) && ['id', 'title', 'level', 'focus'].every(key => typeof value[key] === 'string')
    && typeof value.xp === 'number' && Number.isFinite(value.xp) && value.xp >= 0
    && Array.isArray(value.questions) && value.questions.length > 0 && value.questions.every(isLessonQuestion);
}

export function safeQuestionIndex(value: number, count: number): number {
  return Number.isInteger(value) && value >= 0 && value < count ? value : 0;
}
