import type { LyricLine, Song } from '../data/music';

export type QuizQuestion = {
  line: LyricLine;
  choices: string[];
  correct: string;
  prompt: string;
};

function shuffleItems<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

export function createQuiz(song: Song): QuizQuestion[] {
  const usableLines = shuffleItems(song.lyrics.filter((line) => line.en && line.pt && (!line.translationStatus || line.translationStatus === 'ready')));

  return usableLines
    .filter((line) => line.en && line.pt)
    .slice(0, 5)
    .map((line, index) => {
      const wrongChoices = shuffleItems(usableLines)
        .filter((candidate) => candidate.pt !== line.pt)
        .map((candidate) => candidate.pt)
        .slice(0, 3);
      const fallbackChoices = [
        'Essa frase fala sobre rotina.',
        'Essa frase fala sobre sentimento.',
        'Essa frase fala sobre decisão.'
      ].filter((choice) => choice !== line.pt);
      const choices = shuffleItems([line.pt, ...wrongChoices, ...fallbackChoices].slice(0, 4));
      const prompt = index % 2 === 0 ? 'Qual é a melhor tradução?' : 'Escolha o sentido mais natural da frase.';
      return { line, choices, correct: line.pt, prompt };
    });
}

