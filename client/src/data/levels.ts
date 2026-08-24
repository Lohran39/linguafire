export type AppLevel = {
  level: number;
  name: string;
  xpNeeded: number;
};

export const APP_LEVELS: AppLevel[] = [
  { level: 1, name: 'Iniciante', xpNeeded: 200 },
  { level: 2, name: 'Aprendiz', xpNeeded: 400 },
  { level: 3, name: 'Explorador', xpNeeded: 700 },
  { level: 4, name: 'Comunicador', xpNeeded: 1200 },
  { level: 5, name: 'Fluente', xpNeeded: 2000 }
];

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
