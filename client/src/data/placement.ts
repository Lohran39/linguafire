export type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type PlacementQuestion = {
  level: PlacementLevel;
  text: string;
  hint?: string;
  choices: string[];
  correct: number;
};

const PLACEMENT_LEVELS: PlacementLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const PLACEMENT_TEST_SIZE = 15;

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
  { level: 'A1', text: 'Choose the correct greeting in the morning.', choices: ['Good night', 'Good morning', 'Goodbye', 'See you'], correct: 1 },
  { level: 'A1', text: 'Complete: "This ___ my book."', choices: ['are', 'am', 'is', 'be'], correct: 2 },
  { level: 'A1', text: 'What is "água" in English?', choices: ['Water', 'Food', 'Coffee', 'Bread'], correct: 0 },
  { level: 'A1', text: 'Choose: "They ___ friends."', choices: ['is', 'am', 'are', 'be'], correct: 2 },
  { level: 'A1', text: 'What does "cold" mean?', choices: ['Quente', 'Frio', 'Rápido', 'Lento'], correct: 1 },
  { level: 'A1', text: 'Complete: "I like ___."', choices: ['music', 'musics', 'a music', 'the musics'], correct: 0 },
  { level: 'A1', text: 'What is the opposite of "big"?', choices: ['Tall', 'Small', 'Long', 'Fast'], correct: 1 },
  { level: 'A2', text: '"I have been here ___ Monday."', choices: ['for', 'from', 'at', 'since'], correct: 3 },
  { level: 'A2', text: 'Complete: "She ___ to the gym every day."', choices: ['goes', 'go', 'going', 'went'], correct: 0 },
  { level: 'A2', text: '"I am looking forward ___ hearing from you."', choices: ['for', 'to', 'in', 'at'], correct: 1 },
  { level: 'A2', text: 'Choose: "There ___ many people here yesterday."', choices: ['was', 'were', 'are', 'is'], correct: 1 },
  { level: 'A2', text: 'Complete: "I usually wake up ___ 7 a.m."', choices: ['in', 'on', 'at', 'to'], correct: 2 },
  { level: 'A2', text: 'What does "borrow" mean?', choices: ['Emprestar para alguém', 'Pegar emprestado', 'Comprar', 'Vender'], correct: 1 },
  { level: 'A2', text: 'Choose: "I ___ dinner when you called."', choices: ['cook', 'cooked', 'was cooking', 'am cook'], correct: 2 },
  { level: 'A2', text: 'Complete: "She is taller ___ her brother."', choices: ['than', 'then', 'as', 'like'], correct: 0 },
  { level: 'A2', text: 'Choose the best question: "___ do you live?"', choices: ['When', 'Where', 'Who', 'How many'], correct: 1 },
  { level: 'A2', text: 'Complete: "We went to the beach ___ Sunday."', choices: ['in', 'on', 'at', 'to'], correct: 1 },
  { level: 'B1', text: 'Complete: "If I ___ rich, I would travel."', choices: ['am', 'will be', 'were', 'be'], correct: 2 },
  { level: 'B1', text: 'What does "break a leg" mean?', choices: ['Machuque-se', 'Corra', 'Descanse', 'Boa sorte'], correct: 3 },
  { level: 'B1', text: 'Choose: "By the time I arrived, she ___."', choices: ['had left', 'has left', 'left', 'was leaving'], correct: 0 },
  { level: 'B1', text: 'Complete: "I have never ___ sushi before."', choices: ['eat', 'ate', 'eaten', 'eating'], correct: 2 },
  { level: 'B1', text: 'What does "give up" mean?', choices: ['Desistir', 'Entregar', 'Levantar', 'Acelerar'], correct: 0 },
  { level: 'B1', text: 'Choose: "The movie was ___ than I expected."', choices: ['good', 'best', 'better', 'more better'], correct: 2 },
  { level: 'B1', text: 'Complete: "I wish I ___ more time."', choices: ['have', 'had', 'will have', 'am having'], correct: 1 },
  { level: 'B1', text: 'Choose the natural sentence.', choices: ['I am agree', 'I agree', 'I do agree with it not', 'I agree to you opinion'], correct: 1 },
  { level: 'B1', text: 'What does "run out of" mean?', choices: ['Correr para fora', 'Ficar sem algo', 'Cancelar', 'Economizar'], correct: 1 },
  { level: 'B1', text: 'Complete: "This book was written ___ George Orwell."', choices: ['for', 'from', 'by', 'with'], correct: 2 },
  { level: 'B2', text: 'Correct passive voice: "They built the bridge in 1920."', choices: ['The bridge built in 1920', 'The bridge was built in 1920', 'The bridge has built', 'The bridge is built in 1920'], correct: 1 },
  { level: 'B2', text: '"Had I known, I ___ differently."', choices: ['would act', 'will act', 'would have acted', 'acted'], correct: 2 },
  { level: 'B2', text: 'What does "a dime a dozen" mean?', choices: ['Barato', 'Caro', 'Raro', 'Muito comum'], correct: 3 },
  { level: 'B2', text: 'Choose: "Despite ___ tired, she finished the project."', choices: ['to be', 'being', 'was', 'been'], correct: 1 },
  { level: 'B2', text: 'What does "to pull something off" mean?', choices: ['Remover algo', 'Conseguir realizar algo difícil', 'Puxar com força', 'Adiar um plano'], correct: 1 },
  { level: 'B2', text: 'Complete: "He denied ___ the document."', choices: ['to sign', 'sign', 'signing', 'signed'], correct: 2 },
  { level: 'B2', text: 'Choose the best connector: "She studied hard; ___, she passed."', choices: ['however', 'therefore', 'although', 'unless'], correct: 1 },
  { level: 'B2', text: 'Complete: "The proposal needs to be ___ before Friday."', choices: ['looked up', 'carried on', 'sorted out', 'taken after'], correct: 2 },
  { level: 'B2', text: 'Which sentence sounds most natural?', choices: ['I am used to wake early', 'I used to waking early', 'I am used to waking up early', 'I use to wake early'], correct: 2 },
  { level: 'B2', text: 'What does "under the weather" mean?', choices: ['Com pressa', 'Doente/indisposto', 'Animado', 'Com frio'], correct: 1 },
  { level: 'C1', text: '"Ubiquitous" most closely means:', choices: ['Present everywhere', 'Extremely large', 'Very important', 'Deeply confusing'], correct: 0 },
  { level: 'C1', text: 'Which is grammatically correct?', choices: ['Rarely I encounter such skill', 'Rarely do I encounter such skill', 'I rarely do encounter skill', 'Such skill I rarely encounter'], correct: 1 },
  { level: 'C1', text: 'What does "obfuscate" mean?', choices: ['Esclarecer', 'Ignorar', 'Tornar obscuro/confuso', 'Simplificar'], correct: 2 },
  { level: 'C1', text: 'Choose: "No sooner had we arrived ___ it started raining."', choices: ['when', 'than', 'then', 'that'], correct: 1 },
  { level: 'C1', text: 'What does "mitigate" mean?', choices: ['Intensificar', 'Reduzir o impacto', 'Provar', 'Rejeitar'], correct: 1 },
  { level: 'C1', text: 'Choose the most precise word: "The evidence was ___."', choices: ['compelling', 'compelled', 'compulsive', 'completed'], correct: 0 },
  { level: 'C1', text: 'Complete: "She speaks as though she ___ everything."', choices: ['knows', 'knew', 'has known', 'will know'], correct: 1 },
  { level: 'C1', text: 'What does "fall short of expectations" mean?', choices: ['Superar expectativas', 'Não atingir expectativas', 'Evitar expectativas', 'Explicar expectativas'], correct: 1 },
  { level: 'C1', text: 'Choose the natural collocation.', choices: ['Make a decision', 'Do a decision', 'Take a homework', 'Make an advice'], correct: 0 },
  { level: 'C1', text: 'What does "nuanced" mean?', choices: ['Sem detalhes', 'Com diferenças sutis', 'Muito rápido', 'Totalmente errado'], correct: 1 }
];

function shuffleQuestions(questions: PlacementQuestion[]): PlacementQuestion[] {
  return [...questions].sort(() => Math.random() - 0.5);
}

export function createPlacementQuestions(): PlacementQuestion[] {
  const questionsPerLevel = PLACEMENT_TEST_SIZE / PLACEMENT_LEVELS.length;

  return PLACEMENT_LEVELS.flatMap((level) => {
    const levelQuestions = placementQuestions.filter((question) => question.level === level);
    return shuffleQuestions(levelQuestions).slice(0, questionsPerLevel);
  });
}

export function resolvePlacementLevel(scorePercent: number): PlacementLevel {
  if (scorePercent >= 90) return 'C1';
  if (scorePercent >= 73) return 'B2';
  if (scorePercent >= 53) return 'B1';
  if (scorePercent >= 33) return 'A2';
  return 'A1';
}
