export type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type PlacementQuestion = {
  level: PlacementLevel;
  text: string;
  hint?: string;
  choices: string[];
  correct: number;
};

export const levelResults: Record<PlacementLevel, { name: string; desc: string; color: string }> = {
  A1: { name: 'A1 - Iniciante', desc: 'Foco nas bases: vocabulário simples, frases curtas e rotina diária.', color: '#00ff88' },
  A2: { name: 'A2 - Básico', desc: 'Você já entende o básico e pode expandir conversas simples.', color: '#00d4ff' },
  B1: { name: 'B1 - Intermediário', desc: 'Você já se vira em inglês. Agora é hora de ganhar fluência.', color: '#ffcc00' },
  B2: { name: 'B2 - Intermediário alto', desc: 'Você domina bem o inglês e pode polir vocabulário avançado.', color: '#ff8c00' },
  C1: { name: 'C1 - Avançado', desc: 'Seu foco agora é nuance, precisão e naturalidade.', color: '#ff4d00' }
};

export const placementQuestions: PlacementQuestion[] = [
  { level: 'A1', text: 'What is "casa" in English?', choices: ['House', 'Car', 'Tree', 'Dog'], correct: 0 },
  { level: 'A1', text: 'Choose: "I ___ a student."', hint: 'Verb to be', choices: ['is', 'am', 'are', 'be'], correct: 1 },
  { level: 'A1', text: 'What does "beautiful" mean?', choices: ['Feio', 'Grande', 'Bonito/Linda', 'Pequeno'], correct: 2 },
  { level: 'A2', text: '"I have been here ___ Monday."', choices: ['for', 'from', 'at', 'since'], correct: 3 },
  { level: 'A2', text: 'Complete: "She ___ to the gym every day."', choices: ['goes', 'go', 'going', 'went'], correct: 0 },
  { level: 'A2', text: '"I am looking forward ___ hearing from you."', choices: ['for', 'to', 'in', 'at'], correct: 1 },
  { level: 'B1', text: 'Complete: "If I ___ rich, I would travel."', choices: ['am', 'will be', 'were', 'be'], correct: 2 },
  { level: 'B1', text: 'What does "break a leg" mean?', choices: ['Machuque-se', 'Corra', 'Descanse', 'Boa sorte'], correct: 3 },
  { level: 'B1', text: 'Choose: "By the time I arrived, she ___."', choices: ['had left', 'has left', 'left', 'was leaving'], correct: 0 },
  { level: 'B2', text: 'Correct passive voice: "They built the bridge in 1920."', choices: ['The bridge built in 1920', 'The bridge was built in 1920', 'The bridge has built', 'The bridge is built in 1920'], correct: 1 },
  { level: 'B2', text: '"Had I known, I ___ differently."', choices: ['would act', 'will act', 'would have acted', 'acted'], correct: 2 },
  { level: 'B2', text: 'What does "a dime a dozen" mean?', choices: ['Barato', 'Caro', 'Raro', 'Muito comum'], correct: 3 },
  { level: 'C1', text: '"Ubiquitous" most closely means:', choices: ['Present everywhere', 'Extremely large', 'Very important', 'Deeply confusing'], correct: 0 },
  { level: 'C1', text: 'Which is grammatically correct?', choices: ['Rarely I encounter such skill', 'Rarely do I encounter such skill', 'I rarely do encounter skill', 'Such skill I rarely encounter'], correct: 1 },
  { level: 'C1', text: 'What does "obfuscate" mean?', choices: ['Esclarecer', 'Ignorar', 'Tornar obscuro/confuso', 'Simplificar'], correct: 2 }
];

export function resolvePlacementLevel(scorePercent: number): PlacementLevel {
  if (scorePercent >= 90) return 'C1';
  if (scorePercent >= 73) return 'B2';
  if (scorePercent >= 53) return 'B1';
  if (scorePercent >= 33) return 'A2';
  return 'A1';
}
