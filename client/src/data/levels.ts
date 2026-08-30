export type AppLevel = {
  level: number;
  name: string;
  xpNeeded: number;
};

export type EnglishLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export const ENGLISH_LEVELS: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export const APP_LEVELS: AppLevel[] = [
  { level: 1, name: 'Iniciante', xpNeeded: 200 },
  { level: 2, name: 'Aprendiz', xpNeeded: 400 },
  { level: 3, name: 'Explorador', xpNeeded: 700 },
  { level: 4, name: 'Comunicador', xpNeeded: 1200 },
  { level: 5, name: 'Fluente', xpNeeded: 2000 }
];

export const LEVEL_PROFILES: Record<EnglishLevel, { title: string; focus: string; next: string; practice: string }> = {
  A1: {
    title: 'Base diária',
    focus: 'Frases simples, apresentação, necessidades básicas e perguntas curtas.',
    next: 'Ganhar segurança com rotina, compras e pedidos simples.',
    practice: 'Comece por lições curtas e flashcards essenciais.'
  },
  A2: {
    title: 'Sobrevivência em contexto real',
    focus: 'Viagem, direções, hotel, comida, rotina e conversas previsíveis.',
    next: 'Aumentar repertório e responder com mais naturalidade.',
    practice: 'Priorize viagem, pronúncia e frases de confiança.'
  },
  B1: {
    title: 'Conversas naturais',
    focus: 'Opiniões, experiências, gírias leves, phrasal verbs e explicações simples.',
    next: 'Falar com menos tradução mental e entender contexto.',
    practice: 'Use conversas com IA, músicas e phrasal verbs.'
  },
  B2: {
    title: 'Comunicação independente',
    focus: 'Reuniões, trabalho, argumentos, prazos e expressões mais precisas.',
    next: 'Refinar fluência, vocabulário e gramática em situações profissionais.',
    practice: 'Treine reuniões, debates, escrita e correção gramatical.'
  },
  C1: {
    title: 'Fluência avançada',
    focus: 'Nuance, vocabulário avançado, idioms, naturalidade e precisão.',
    next: 'Lapidar estilo, velocidade e expressão natural.',
    practice: 'Foque em nativos, conversas longas e revisão avançada.'
  }
};

export function getLevelProgress(level: number, xp: number) {
  const safeLevel = Math.max(1, Math.min(level || 1, APP_LEVELS.length));
  const current = APP_LEVELS[safeLevel - 1] || APP_LEVELS[0];
  const previous = safeLevel > 1 ? APP_LEVELS[safeLevel - 2] : null;
  const previousXp = previous?.xpNeeded || 0;
  const totalNeeded = Math.max(current.xpNeeded - previousXp, 1);
  const currentXp = Math.max(xp - previousXp, 0);
  const percent = Math.max(0, Math.min(100, Math.round((currentXp / totalNeeded) * 100)));

  return {
    current,
    previousXp,
    nextXp: current.xpNeeded,
    percent
  };
}

export function normalizeEnglishLevel(level?: string | null): EnglishLevel {
  const normalized = String(level || 'A1').toUpperCase();
  return ENGLISH_LEVELS.includes(normalized as EnglishLevel) ? (normalized as EnglishLevel) : 'A1';
}

export function englishLevelIndex(level?: string | null) {
  return ENGLISH_LEVELS.indexOf(normalizeEnglishLevel(level));
}

export function englishLevelDistance(contentLevel: string, userLevel?: string | null) {
  return Math.abs(englishLevelIndex(contentLevel) - englishLevelIndex(userLevel));
}

export function isRecommendedEnglishLevel(contentLevel: string, userLevel?: string | null, maxDistance = 0) {
  return englishLevelDistance(contentLevel, userLevel) <= maxDistance;
}

export function sortByEnglishLevel<T extends { level: string }>(items: T[], userLevel?: string | null) {
  return [...items].sort((a, b) => {
    const distance = englishLevelDistance(a.level, userLevel) - englishLevelDistance(b.level, userLevel);
    if (distance !== 0) return distance;
    return englishLevelIndex(a.level) - englishLevelIndex(b.level);
  });
}
