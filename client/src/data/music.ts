export type LyricLine = {
  en: string;
  pt: string;
  explain: string;
};

export type Song = {
  key: string;
  title: string;
  artist: string;
  ytId: string;
  level: string;
  thumb: string;
  lyrics: LyricLine[];
};

export const SONGS: Song[] = [
  {
    key: 'blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    ytId: '4NRXx6U8ABQ',
    level: 'Intermediário',
    thumb: 'Night drive',
    lyrics: [
      {
        en: "I've been tryna call",
        pt: 'Eu fico tentando te ligar',
        explain: 'tryna = trying to. Forma coloquial muito comum em música e fala rápida.'
      },
      {
        en: "I've been on my own for long enough",
        pt: 'Fiquei sozinho por tempo suficiente',
        explain: 'on my own significa sozinho ou por conta própria.'
      },
      {
        en: 'Maybe you can show me how to love',
        pt: 'Talvez você possa me mostrar como amar',
        explain: 'show me how to + verbo serve para pedir demonstração.'
      },
      {
        en: "I'm blinded by the lights",
        pt: 'Estou cego pelas luzes',
        explain: 'blinded by também funciona como metáfora: ficar deslumbrado por algo.'
      }
    ]
  },
  {
    key: 'shape-of-you',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    ytId: 'JGwWNGJdvx8',
    level: 'Iniciante',
    thumb: 'Pop guitar',
    lyrics: [
      {
        en: "The club isn't the best place to find a lover",
        pt: 'O clube não é o melhor lugar para encontrar um amor',
        explain: "isn't the best place to = não é o melhor lugar para."
      },
      {
        en: 'The bar is where I go',
        pt: 'O bar é onde eu vou',
        explain: 'where I go é uma estrutura simples para falar de destino habitual.'
      },
      {
        en: 'Come over and start up a conversation',
        pt: 'Venha e comece uma conversa',
        explain: 'come over indica se aproximar ou ir até alguém.'
      },
      {
        en: "I'm in love with the shape of you",
        pt: 'Estou apaixonado pela sua forma',
        explain: 'in love with = apaixonado por.'
      }
    ]
  },
  {
    key: 'someone-like-you',
    title: 'Someone Like You',
    artist: 'Adele',
    ytId: 'hLQl3WQQoQ0',
    level: 'Intermediário',
    thumb: 'Piano ballad',
    lyrics: [
      {
        en: "I heard that you're settled down",
        pt: 'Ouvi dizer que você se estabeleceu',
        explain: 'settle down pode significar criar uma vida mais estável.'
      },
      {
        en: 'You found a girl and you are married now',
        pt: 'Você encontrou uma garota e está casado',
        explain: 'found é passado de find.'
      },
      {
        en: 'I hate to turn up out of the blue',
        pt: 'Odeio aparecer do nada',
        explain: 'out of the blue = inesperadamente.'
      },
      {
        en: "Never mind, I'll find someone like you",
        pt: 'Não importa, vou encontrar alguém como você',
        explain: 'never mind = deixa pra lá ou não importa.'
      }
    ]
  },
  {
    key: 'stay',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    ytId: 'kTJczUoc26U',
    level: 'Iniciante',
    thumb: 'Pop vocal',
    lyrics: [
      {
        en: 'I do the same thing I told you that I never would',
        pt: 'Faço a mesma coisa que disse que nunca faria',
        explain: 'would aparece aqui como ideia de promessa ou intenção no passado.'
      },
      {
        en: 'I told you I changed',
        pt: 'Disse que mudei',
        explain: 'changed é passado de change.'
      },
      {
        en: "I need to stop, but I can't",
        pt: 'Preciso parar, mas não consigo',
        explain: "can't expressa impossibilidade ou falta de capacidade."
      },
      {
        en: 'I just need you to stay',
        pt: 'Só preciso que você fique',
        explain: 'need you to + verbo = precisar que alguém faça algo.'
      }
    ]
  }
];

export const SUGGESTIONS = [
  ...SONGS,
  { key: 'hello', title: 'Hello', artist: 'Adele', ytId: 'YQHsXMglC9A', level: 'Intermediário', thumb: 'Vocal', lyrics: [] },
  { key: 'believer', title: 'Believer', artist: 'Imagine Dragons', ytId: '7wtfhZwyrcc', level: 'Intermediário', thumb: 'Rock', lyrics: [] },
  { key: 'yellow', title: 'Yellow', artist: 'Coldplay', ytId: 'yKNxeF4KMsY', level: 'Iniciante', thumb: 'Alt pop', lyrics: [] }
];

export function normalizeSongText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findSong(query: string) {
  const normalizedQuery = normalizeSongText(query);
  if (!normalizedQuery) return null;

  return (
    SUGGESTIONS.find((song) => {
      const haystack = normalizeSongText(`${song.title} ${song.artist}`);
      return haystack.includes(normalizedQuery);
    }) || null
  );
}

export function getSongByKey(key: string) {
  return SONGS.find((song) => song.key === key) || SUGGESTIONS.find((song) => song.key === key) || null;
}
