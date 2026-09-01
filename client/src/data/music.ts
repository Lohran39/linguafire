export type LyricLine = {
  en: string;
  pt: string;
  explain: string;
  time?: number;
};

export type Song = {
  key: string;
  title: string;
  artist: string;
  ytId: string;
  level: string;
  thumb: string;
  focus: string;
  tags: string[];
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
    focus: 'Velocidade, contrações e frases emocionais',
    tags: ['pop', 'listening', 'phrasal'],
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
    focus: 'Rotina, lugares e conversa informal',
    tags: ['pop', 'daily', 'conversation'],
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
    focus: 'Passado, sentimentos e expressões naturais',
    tags: ['ballad', 'past', 'emotion'],
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
    focus: 'Necessidade, promessa e fala rápida',
    tags: ['pop', 'daily', 'pronunciation'],
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
  {
    key: 'hello',
    title: 'Hello',
    artist: 'Adele',
    ytId: 'YQHsXMglC9A',
    level: 'Intermediário',
    thumb: 'Vocal',
    focus: 'Cumprimentos, passado e reconexão',
    tags: ['ballad', 'past', 'emotion'],
    lyrics: []
  },
  {
    key: 'believer',
    title: 'Believer',
    artist: 'Imagine Dragons',
    ytId: '7wtfhZwyrcc',
    level: 'Intermediário',
    thumb: 'Rock',
    focus: 'Ritmo forte, vocabulário de superação',
    tags: ['rock', 'listening', 'energy'],
    lyrics: []
  },
  {
    key: 'yellow',
    title: 'Yellow',
    artist: 'Coldplay',
    ytId: 'yKNxeF4KMsY',
    level: 'Iniciante',
    thumb: 'Alt pop',
    focus: 'Adjetivos, descrição e pronúncia lenta',
    tags: ['pop', 'slow', 'description'],
    lyrics: []
  },
  {
    key: 'counting-stars',
    title: 'Counting Stars',
    artist: 'OneRepublic',
    ytId: 'hT_nvWreIhg',
    level: 'Intermediário',
    thumb: 'Pop rock',
    focus: 'Sonhos, escolhas e contraste de ideias',
    tags: ['pop', 'rock', 'listening'],
    lyrics: []
  },
  {
    key: 'a-thousand-years',
    title: 'A Thousand Years',
    artist: 'Christina Perri',
    ytId: 'rtOvBOTyX00',
    level: 'Iniciante',
    thumb: 'Slow',
    focus: 'Pronúncia clara, futuro e sentimentos',
    tags: ['slow', 'ballad', 'pronunciation'],
    lyrics: []
  },
  {
    key: 'bad-habits',
    title: 'Bad Habits',
    artist: 'Ed Sheeran',
    ytId: 'orJSJGHjBLI',
    level: 'Intermediário',
    thumb: 'Pop beat',
    focus: 'Hábitos, presente simples e vocabulário urbano',
    tags: ['pop', 'daily', 'grammar'],
    lyrics: []
  },
  {
    key: 'drivers-license',
    title: 'drivers license',
    artist: 'Olivia Rodrigo',
    ytId: 'ZmDBbnmKpqQ',
    level: 'Intermediário',
    thumb: 'Story',
    focus: 'Narrativa, passado e emoção',
    tags: ['ballad', 'past', 'story'],
    lyrics: []
  },
  {
    key: 'viva-la-vida',
    title: 'Viva La Vida',
    artist: 'Coldplay',
    ytId: 'dvgZkm1xWPE',
    level: 'Avançado',
    thumb: 'Classic',
    focus: 'Metáforas, narrativa e vocabulário abstrato',
    tags: ['rock', 'story', 'advanced'],
    lyrics: []
  },
  {
    key: 'no-idea',
    title: 'No Idea',
    artist: 'Don Toliver',
    ytId: '_r-nPqWGG6c',
    level: 'Intermediário',
    thumb: 'Trap',
    focus: 'Slang, ritmo urbano e contrações',
    tags: ['pop', 'listening', 'slang'],
    lyrics: []
  },
  {
    key: 'raindance',
    title: 'Raindance',
    artist: 'Dave',
    ytId: 'SG8PCmIom_U',
    level: 'Avançado',
    thumb: 'UK rap',
    focus: 'Inglês britânico, ritmo rápido e vocabulário urbano',
    tags: ['listening', 'advanced', 'slang'],
    lyrics: []
  }
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
