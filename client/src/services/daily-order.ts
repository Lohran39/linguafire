export function getDailyPhraseWeight(id: string, today = new Date().toISOString().slice(0, 10)) {
  // Mix the complete date/id pair: adding character codes kept the same ordering every day.
  let hash = 2166136261;
  for (const character of `${today}:${id}`) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return hash;
}
