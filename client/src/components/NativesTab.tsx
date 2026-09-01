import { FormEvent, useEffect, useMemo, useState } from 'react';
import { APP_LEVELS, normalizeEnglishLevel, type EnglishLevel } from '../data/levels';
import { updateProfile, type UserProfile } from '../services/auth';
import {
  buildNativesFallbackUrl,
  buildRetryVariants,
  coachNativeReply,
  deleteSavedNativeVideo,
  getSavedNativeVideos,
  nativeLanguages,
  nativeSuggestions,
  reportBadNativeVideo,
  saveNativeVideo,
  searchNatives,
  type NativeCoachResult,
  type NativeSavedVideo,
  type NativesLanguage,
  type NativesSearchResult
} from '../services/natives';

type NativeSituationId =
  | 'restaurant'
  | 'airport'
  | 'hotel'
  | 'job_interview'
  | 'small_talk'
  | 'shopping'
  | 'emergency'
  | 'meeting'
  | 'pharmacy'
  | 'doctor'
  | 'bank'
  | 'delivery'
  | 'gym'
  | 'friendship';

type NativeSituation = {
  id: NativeSituationId;
  title: string;
  copy: string;
  icon: string;
};

type NativePhrase = {
  id: string;
  level: EnglishLevel;
  situation: NativeSituationId;
  casual: string;
  natural: string;
  meaning: string;
  useWhen: string;
  avoidWhen: string;
  example: string;
  prompt: string;
  expected: string;
};

type NativePack = {
  id: string;
  title: string;
  copy: string;
  situation: NativeSituationId;
};

type NativePracticeHistoryItem = {
  id: string;
  phraseId: string;
  situation: NativeSituationId;
  level: EnglishLevel;
  score: number;
  xp: number;
  date: string;
  natural: string;
};

type NativeSearchHistoryItem = {
  query: string;
  lang: NativesLanguage;
  date: string;
};

type NativesTabProps = {
  user: UserProfile;
  onProfileRefresh: (user: UserProfile) => void;
};

const levelOrder: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const nativeDailyGoal = 3;

const nativeSituations: NativeSituation[] = [
  { id: 'restaurant', title: 'Restaurante', copy: 'Pedidos, alergias, conta e educação.', icon: 'R' },
  { id: 'airport', title: 'Aeroporto', copy: 'Portão, embarque, bagagem e imigração.', icon: 'A' },
  { id: 'hotel', title: 'Hotel', copy: 'Check-in, reserva, problemas e pedidos.', icon: 'H' },
  { id: 'job_interview', title: 'Entrevista', copy: 'Respostas profissionais e naturais.', icon: 'E' },
  { id: 'small_talk', title: 'Small talk', copy: 'Conversa leve sem parecer robótico.', icon: 'S' },
  { id: 'shopping', title: 'Compras', copy: 'Preço, tamanho, troca e opinião.', icon: '$' },
  { id: 'emergency', title: 'Emergência', copy: 'Pedir ajuda com clareza e urgência.', icon: '!' },
  { id: 'meeting', title: 'Reunião', copy: 'Trabalho, prazos, alinhamento e discordância.', icon: 'M' },
  { id: 'pharmacy', title: 'Farmácia', copy: 'Remédio, sintomas leves e orientação.', icon: 'F' },
  { id: 'doctor', title: 'Médico', copy: 'Consulta, dor, histórico e sintomas.', icon: 'D' },
  { id: 'bank', title: 'Banco', copy: 'Cartão, saque, taxa e conta.', icon: 'B' },
  { id: 'delivery', title: 'Delivery', copy: 'Pedido, atraso, endereço e erro.', icon: 'P' },
  { id: 'gym', title: 'Academia', copy: 'Treino, aparelho, matrícula e rotina.', icon: 'G' },
  { id: 'friendship', title: 'Amizade', copy: 'Convites, planos, apoio e conversa.', icon: 'A' }
];

const nativePacks: NativePack[] = [
  { id: 'travel-start', title: 'Primeira viagem', copy: 'Aeroporto, hotel e pedidos básicos.', situation: 'airport' },
  { id: 'daily-social', title: 'Social diário', copy: 'Small talk, convite e resposta curta.', situation: 'small_talk' },
  { id: 'work-mode', title: 'Inglês de trabalho', copy: 'Reunião, entrevista e follow-up.', situation: 'meeting' },
  { id: 'safe-trip', title: 'Emergência fora do país', copy: 'Ajuda, localização e problema.', situation: 'emergency' },
  { id: 'health-basic', title: 'Saúde básica', copy: 'Farmácia, médico e sintomas.', situation: 'pharmacy' },
  { id: 'daily-life', title: 'Vida fora', copy: 'Banco, delivery, academia e amizade.', situation: 'delivery' }
];

const nativePhrases: NativePhrase[] = [
  {
    id: 'a1-restaurant-water',
    level: 'A1',
    situation: 'restaurant',
    casual: 'I want water.',
    natural: 'Can I have some water, please?',
    meaning: 'Forma educada de pedir água.',
    useWhen: 'Use para pedir algo simples em restaurante, café ou avião.',
    avoidWhen: 'Evite "I want" quando quiser soar educado.',
    example: 'Can I have some water, please? And the menu too.',
    prompt: 'Você está em um restaurante e quer pedir água de forma educada.',
    expected: 'Can I have some water, please?'
  },
  {
    id: 'a1-airport-gate',
    level: 'A1',
    situation: 'airport',
    casual: 'Where is gate five?',
    natural: 'Excuse me, where is gate five?',
    meaning: 'Pergunta simples com abertura educada.',
    useWhen: 'Use para pedir direção no aeroporto.',
    avoidWhen: 'Não fale seco se estiver pedindo ajuda a um funcionário.',
    example: 'Excuse me, where is gate five? My flight leaves soon.',
    prompt: 'Você precisa achar o portão 5 no aeroporto.',
    expected: 'Excuse me, where is gate five?'
  },
  {
    id: 'a1-hotel-reservation',
    level: 'A1',
    situation: 'hotel',
    casual: 'I have reservation.',
    natural: 'I have a reservation under my name.',
    meaning: 'Frase natural para check-in.',
    useWhen: 'Use na recepção do hotel.',
    avoidWhen: 'Não esqueça o artigo "a" antes de reservation.',
    example: 'Hi, I have a reservation under my name.',
    prompt: 'Você chegou ao hotel e quer fazer check-in.',
    expected: 'I have a reservation under my name.'
  },
  {
    id: 'a1-shopping-price',
    level: 'A1',
    situation: 'shopping',
    casual: 'How much?',
    natural: 'How much is this?',
    meaning: 'Pergunta direta e correta sobre preço.',
    useWhen: 'Use em loja, feira ou mercado.',
    avoidWhen: 'Evite apontar e falar só "how much" se quiser soar completo.',
    example: 'How much is this jacket?',
    prompt: 'Você está em uma loja e quer saber o preço.',
    expected: 'How much is this?'
  },
  {
    id: 'a2-restaurant-vegetarian',
    level: 'A2',
    situation: 'restaurant',
    casual: 'I don’t eat meat.',
    natural: 'I don’t eat meat. Do you have any vegetarian options?',
    meaning: 'Explica restrição e pede alternativa.',
    useWhen: 'Use ao falar sobre preferência ou restrição alimentar.',
    avoidWhen: 'Evite esperar que a pessoa adivinhe o que você precisa.',
    example: 'I don’t eat meat. Do you have any vegetarian options?',
    prompt: 'Você não come carne e quer uma opção vegetariana.',
    expected: 'Do you have any vegetarian options?'
  },
  {
    id: 'a2-hotel-bags',
    level: 'A2',
    situation: 'hotel',
    casual: 'Can I put my bags here?',
    natural: 'Could I leave my bags here for a few hours?',
    meaning: 'Pedido mais educado e específico.',
    useWhen: 'Use antes do check-in ou depois do checkout.',
    avoidWhen: 'Evite "put my bags" em contexto de recepção.',
    example: 'Could I leave my bags here for a few hours?',
    prompt: 'Seu check-in ainda não abriu e você quer deixar as malas no hotel.',
    expected: 'Could I leave my bags here for a few hours?'
  },
  {
    id: 'a2-airport-bag',
    level: 'A2',
    situation: 'airport',
    casual: 'My bag is not here.',
    natural: 'My bag hasn’t arrived yet. Could you help me?',
    meaning: 'Explica problema de bagagem com clareza.',
    useWhen: 'Use no balcão de bagagem.',
    avoidWhen: 'Evite frases vagas como "my bag problem".',
    example: 'My bag hasn’t arrived yet. Could you help me file a report?',
    prompt: 'Sua mala não apareceu na esteira.',
    expected: 'My bag hasn’t arrived yet. Could you help me?'
  },
  {
    id: 'b1-small-talk-weekend',
    level: 'B1',
    situation: 'small_talk',
    casual: 'What you did weekend?',
    natural: 'What did you get up to over the weekend?',
    meaning: 'Pergunta natural sobre fim de semana.',
    useWhen: 'Use em conversa leve com colega ou amigo.',
    avoidWhen: 'Evite com pessoas muito formais se ainda não há intimidade.',
    example: 'Hey, what did you get up to over the weekend?',
    prompt: 'Você quer perguntar de forma natural sobre o fim de semana de alguém.',
    expected: 'What did you get up to over the weekend?'
  },
  {
    id: 'b1-shopping-size',
    level: 'B1',
    situation: 'shopping',
    casual: 'Have other size?',
    natural: 'Do you have this in a different size?',
    meaning: 'Pedido natural para outra numeração.',
    useWhen: 'Use em lojas de roupa e calçado.',
    avoidWhen: 'Evite "other size" sem estrutura da pergunta.',
    example: 'Do you have this in a different size, maybe a medium?',
    prompt: 'Você gostou da roupa, mas precisa de outro tamanho.',
    expected: 'Do you have this in a different size?'
  },
  {
    id: 'b1-meeting-reschedule',
    level: 'B1',
    situation: 'meeting',
    casual: 'Can we change the meeting?',
    natural: 'Could we move the meeting to tomorrow?',
    meaning: 'Pedir remarcação com educação.',
    useWhen: 'Use no trabalho para ajustar agenda.',
    avoidWhen: 'Não diga só "change meeting" em ambiente profissional.',
    example: 'Could we move the meeting to tomorrow afternoon?',
    prompt: 'Você precisa remarcar uma reunião para amanhã.',
    expected: 'Could we move the meeting to tomorrow?'
  },
  {
    id: 'b2-meeting-options',
    level: 'B2',
    situation: 'meeting',
    casual: 'Explain the options.',
    natural: 'Could you walk me through the options?',
    meaning: 'Pedir explicação de forma profissional e natural.',
    useWhen: 'Use quando quer entender detalhes sem soar brusco.',
    avoidWhen: 'Evite comandos secos em reunião.',
    example: 'Could you walk me through the options before we decide?',
    prompt: 'Você está em reunião e quer entender as opções disponíveis.',
    expected: 'Could you walk me through the options?'
  },
  {
    id: 'b2-interview-strength',
    level: 'B2',
    situation: 'job_interview',
    casual: 'I am good at solving problems.',
    natural: 'One of my strengths is solving problems under pressure.',
    meaning: 'Resposta mais profissional sobre ponto forte.',
    useWhen: 'Use em entrevistas ao falar de competência.',
    avoidWhen: 'Evite resposta genérica sem contexto.',
    example: 'One of my strengths is solving problems under pressure, especially with tight deadlines.',
    prompt: 'O entrevistador perguntou sobre um ponto forte seu.',
    expected: 'One of my strengths is solving problems under pressure.'
  },
  {
    id: 'b2-emergency-help',
    level: 'B2',
    situation: 'emergency',
    casual: 'I need doctor now.',
    natural: 'I need medical help right away.',
    meaning: 'Pedido urgente e claro por ajuda médica.',
    useWhen: 'Use em emergência médica.',
    avoidWhen: 'Não complique a frase em uma situação urgente.',
    example: 'I need medical help right away. My friend is having trouble breathing.',
    prompt: 'Você precisa pedir ajuda médica imediata.',
    expected: 'I need medical help right away.'
  },
  {
    id: 'c1-meeting-disagree',
    level: 'C1',
    situation: 'meeting',
    casual: 'I don’t agree.',
    natural: 'I see your point, but I’d frame it a bit differently.',
    meaning: 'Discordância sofisticada e profissional.',
    useWhen: 'Use em reunião para discordar sem criar atrito.',
    avoidWhen: 'Evite parecer agressivo quando o contexto pede diplomacia.',
    example: 'I see your point, but I’d frame it a bit differently based on the data.',
    prompt: 'Você discorda de uma ideia em uma reunião, mas quer soar diplomático.',
    expected: 'I see your point, but I’d frame it a bit differently.'
  },
  {
    id: 'c1-small-talk-subtle',
    level: 'C1',
    situation: 'small_talk',
    casual: 'That is good news.',
    natural: 'That’s actually a pretty big deal. Congrats.',
    meaning: 'Reação natural e calorosa a uma boa notícia.',
    useWhen: 'Use em conversa informal ou semi-informal.',
    avoidWhen: 'Evite em mensagens muito formais.',
    example: 'You got the role? That’s actually a pretty big deal. Congrats.',
    prompt: 'Um amigo contou uma conquista importante.',
    expected: 'That’s actually a pretty big deal. Congrats.'
  },
  {
    id: 'a1-restaurant-bill',
    level: 'A1',
    situation: 'restaurant',
    casual: 'Bill, please.',
    natural: 'Could I get the bill, please?',
    meaning: 'Forma educada de pedir a conta.',
    useWhen: 'Use no fim da refeição em restaurante ou café.',
    avoidWhen: 'Evite só "bill" se quiser soar educado.',
    example: 'Could I get the bill, please? We are ready to pay.',
    prompt: 'Você terminou de comer e quer pedir a conta.',
    expected: 'Could I get the bill, please?'
  },
  {
    id: 'a1-small-talk-name',
    level: 'A1',
    situation: 'small_talk',
    casual: 'Your name?',
    natural: 'What’s your name?',
    meaning: 'Pergunta básica e correta para saber o nome.',
    useWhen: 'Use quando conhecer alguém pela primeira vez.',
    avoidWhen: 'Evite perguntar sem contexto em ambiente formal.',
    example: 'Hi, I’m Lohran. What’s your name?',
    prompt: 'Você acabou de conhecer uma pessoa e quer perguntar o nome dela.',
    expected: 'What’s your name?'
  },
  {
    id: 'a1-emergency-police',
    level: 'A1',
    situation: 'emergency',
    casual: 'I need police.',
    natural: 'I need the police, please.',
    meaning: 'Pedido simples e claro por polícia.',
    useWhen: 'Use quando precisar pedir ajuda policial.',
    avoidWhen: 'Evite explicar demais se a situação é urgente.',
    example: 'I need the police, please. Someone stole my bag.',
    prompt: 'Você precisa pedir ajuda da polícia.',
    expected: 'I need the police, please.'
  },
  {
    id: 'a2-airport-delay',
    level: 'A2',
    situation: 'airport',
    casual: 'Flight late?',
    natural: 'Is my flight delayed?',
    meaning: 'Pergunta clara sobre atraso de voo.',
    useWhen: 'Use no balcão da companhia aérea ou no portão.',
    avoidWhen: 'Evite usar apenas palavras soltas.',
    example: 'Excuse me, is my flight delayed?',
    prompt: 'Você quer saber se seu voo está atrasado.',
    expected: 'Is my flight delayed?'
  },
  {
    id: 'a2-shopping-return',
    level: 'A2',
    situation: 'shopping',
    casual: 'Can change this?',
    natural: 'Can I exchange this?',
    meaning: 'Forma natural de pedir troca de produto.',
    useWhen: 'Use quando quer trocar uma compra.',
    avoidWhen: 'Não use "change this" para troca em loja.',
    example: 'Can I exchange this for a smaller size?',
    prompt: 'Você comprou uma peça e quer trocar.',
    expected: 'Can I exchange this?'
  },
  {
    id: 'a2-small-talk-food',
    level: 'A2',
    situation: 'small_talk',
    casual: 'You like here food?',
    natural: 'Do you like the food here?',
    meaning: 'Pergunta natural sobre comida em um lugar.',
    useWhen: 'Use em conversa casual em restaurante, evento ou festa.',
    avoidWhen: 'Evite inverter a ordem da pergunta.',
    example: 'Do you like the food here? I think it’s really good.',
    prompt: 'Você quer puxar assunto sobre a comida do lugar.',
    expected: 'Do you like the food here?'
  },
  {
    id: 'b1-hotel-room-issue',
    level: 'B1',
    situation: 'hotel',
    casual: 'The air does not work.',
    natural: 'The air conditioning doesn’t seem to be working.',
    meaning: 'Forma educada de relatar problema no quarto.',
    useWhen: 'Use ao falar com a recepção sobre algo quebrado.',
    avoidWhen: 'Evite soar acusatório logo no começo.',
    example: 'The air conditioning doesn’t seem to be working. Could someone check it?',
    prompt: 'O ar-condicionado do quarto não funciona e você quer pedir ajuda.',
    expected: 'The air conditioning doesn’t seem to be working.'
  },
  {
    id: 'b1-emergency-lost',
    level: 'B1',
    situation: 'emergency',
    casual: 'I am lost.',
    natural: 'I’m lost. Could you point me toward the nearest station?',
    meaning: 'Pedir direção com clareza quando está perdido.',
    useWhen: 'Use na rua, metrô ou aeroporto.',
    avoidWhen: 'Evite dar detalhes pessoais demais a desconhecidos.',
    example: 'I’m lost. Could you point me toward the nearest station?',
    prompt: 'Você se perdeu e precisa achar a estação mais próxima.',
    expected: 'Could you point me toward the nearest station?'
  },
  {
    id: 'b1-interview-experience',
    level: 'B1',
    situation: 'job_interview',
    casual: 'I worked with customers.',
    natural: 'I have experience working with customers.',
    meaning: 'Resposta profissional sobre experiência.',
    useWhen: 'Use em entrevista ao resumir experiência anterior.',
    avoidWhen: 'Evite frases curtas demais sem contexto.',
    example: 'I have experience working with customers and solving daily issues.',
    prompt: 'O entrevistador perguntou sobre sua experiência com clientes.',
    expected: 'I have experience working with customers.'
  },
  {
    id: 'b2-airport-connection',
    level: 'B2',
    situation: 'airport',
    casual: 'I can lose connection.',
    natural: 'I’m worried I might miss my connecting flight.',
    meaning: 'Explica preocupação com conexão de voo.',
    useWhen: 'Use com funcionário da companhia aérea.',
    avoidWhen: 'Evite tradução literal de "perder conexão".',
    example: 'I’m worried I might miss my connecting flight. Is there anything I can do?',
    prompt: 'Seu voo atrasou e você teme perder a conexão.',
    expected: 'I’m worried I might miss my connecting flight.'
  },
  {
    id: 'b2-shopping-opinion',
    level: 'B2',
    situation: 'shopping',
    casual: 'It fits me?',
    natural: 'Do you think this fits me well?',
    meaning: 'Pedir opinião de forma natural.',
    useWhen: 'Use ao provar roupa com vendedor ou amigo.',
    avoidWhen: 'Evite perguntar "it fits me?" sem auxiliar.',
    example: 'Do you think this fits me well, or should I try a different size?',
    prompt: 'Você está provando roupa e quer pedir opinião.',
    expected: 'Do you think this fits me well?'
  },
  {
    id: 'c1-interview-fit',
    level: 'C1',
    situation: 'job_interview',
    casual: 'I think I am good for this job.',
    natural: 'I think my background is a strong fit for this role.',
    meaning: 'Forma confiante e profissional de vender seu perfil.',
    useWhen: 'Use ao explicar por que você combina com a vaga.',
    avoidWhen: 'Evite soar genérico ou arrogante.',
    example: 'I think my background is a strong fit for this role, especially because of my customer-facing experience.',
    prompt: 'Você quer explicar por que seu perfil combina com a vaga.',
    expected: 'My background is a strong fit for this role.'
  },
  {
    id: 'c1-restaurant-complaint',
    level: 'C1',
    situation: 'restaurant',
    casual: 'This is wrong.',
    natural: 'I’m sorry, but this doesn’t seem to be what I ordered.',
    meaning: 'Reclamação educada sem soar rude.',
    useWhen: 'Use quando o pedido vem errado.',
    avoidWhen: 'Evite acusar o atendente diretamente.',
    example: 'I’m sorry, but this doesn’t seem to be what I ordered. Could you check it for me?',
    prompt: 'Seu pedido veio errado e você quer avisar educadamente.',
    expected: 'This doesn’t seem to be what I ordered.'
  },
  {
    id: 'c1-emergency-report',
    level: 'C1',
    situation: 'emergency',
    casual: 'I need make report.',
    natural: 'I’d like to file a report about a stolen item.',
    meaning: 'Forma precisa para registrar ocorrência.',
    useWhen: 'Use com polícia, segurança ou atendimento oficial.',
    avoidWhen: 'Evite "make report", que soa traduzido.',
    example: 'I’d like to file a report about a stolen item. My passport is missing.',
    prompt: 'Você precisa registrar um item roubado.',
    expected: 'I’d like to file a report about a stolen item.'
  },
  {
    id: 'a1-pharmacy-headache',
    level: 'A1',
    situation: 'pharmacy',
    casual: 'I have headache.',
    natural: 'I have a headache. Do you have something for it?',
    meaning: 'Pedir ajuda simples na farmácia.',
    useWhen: 'Use para sintomas leves quando quer uma recomendação.',
    avoidWhen: 'Não peça medicamento específico se não sabe o nome correto.',
    example: 'I have a headache. Do you have something for it?',
    prompt: 'Você está com dor de cabeça e quer pedir algo na farmácia.',
    expected: 'I have a headache. Do you have something for it?'
  },
  {
    id: 'a2-pharmacy-dose',
    level: 'A2',
    situation: 'pharmacy',
    casual: 'How many I take?',
    natural: 'How often should I take this?',
    meaning: 'Perguntar frequência de uso.',
    useWhen: 'Use ao receber orientação sobre remédio.',
    avoidWhen: 'Evite adivinhar dose ou frequência.',
    example: 'How often should I take this, and should I take it with food?',
    prompt: 'Você quer saber de quanto em quanto tempo tomar o remédio.',
    expected: 'How often should I take this?'
  },
  {
    id: 'b1-pharmacy-allergy',
    level: 'B1',
    situation: 'pharmacy',
    casual: 'I am allergic this.',
    natural: 'I’m allergic to this ingredient.',
    meaning: 'Avisar alergia com clareza.',
    useWhen: 'Use antes de comprar ou tomar um medicamento.',
    avoidWhen: 'Evite só dizer "allergy" sem explicar.',
    example: 'I’m allergic to this ingredient. Is there an alternative?',
    prompt: 'Você percebeu um ingrediente que causa alergia.',
    expected: 'I’m allergic to this ingredient.'
  },
  {
    id: 'a1-doctor-pain',
    level: 'A1',
    situation: 'doctor',
    casual: 'My stomach hurts.',
    natural: 'My stomach hurts.',
    meaning: 'Explicar dor de forma simples.',
    useWhen: 'Use numa consulta ou pronto atendimento.',
    avoidWhen: 'Evite gesticular sem tentar dizer onde dói.',
    example: 'My stomach hurts, and I feel sick.',
    prompt: 'Você precisa dizer ao médico que está com dor no estômago.',
    expected: 'My stomach hurts.'
  },
  {
    id: 'b1-doctor-symptoms',
    level: 'B1',
    situation: 'doctor',
    casual: 'I feel bad since yesterday.',
    natural: 'I’ve been feeling unwell since yesterday.',
    meaning: 'Explicar duração dos sintomas.',
    useWhen: 'Use para dizer desde quando está se sentindo mal.',
    avoidWhen: 'Evite "I feel bad" sem tempo ou sintoma.',
    example: 'I’ve been feeling unwell since yesterday, and I have a fever.',
    prompt: 'Você quer explicar que está mal desde ontem.',
    expected: 'I’ve been feeling unwell since yesterday.'
  },
  {
    id: 'c1-doctor-history',
    level: 'C1',
    situation: 'doctor',
    casual: 'This happened before.',
    natural: 'I’ve had similar symptoms in the past.',
    meaning: 'Dar histórico médico com precisão.',
    useWhen: 'Use quando o médico pergunta se isso já aconteceu.',
    avoidWhen: 'Não omita contexto importante sobre recorrência.',
    example: 'I’ve had similar symptoms in the past, but they went away after a few days.',
    prompt: 'O médico pergunta se você já teve sintomas parecidos.',
    expected: 'I’ve had similar symptoms in the past.'
  },
  {
    id: 'a1-bank-card',
    level: 'A1',
    situation: 'bank',
    casual: 'My card not work.',
    natural: 'My card isn’t working.',
    meaning: 'Explicar problema com cartão.',
    useWhen: 'Use no banco, caixa eletrônico ou atendimento.',
    avoidWhen: 'Evite "not work" sem verbo auxiliar.',
    example: 'My card isn’t working. Could you help me?',
    prompt: 'Seu cartão não está funcionando.',
    expected: 'My card isn’t working.'
  },
  {
    id: 'a2-bank-withdraw',
    level: 'A2',
    situation: 'bank',
    casual: 'I want take money.',
    natural: 'I’d like to withdraw some cash.',
    meaning: 'Pedir saque em inglês natural.',
    useWhen: 'Use no banco ou caixa.',
    avoidWhen: 'Evite tradução literal de "tirar dinheiro".',
    example: 'I’d like to withdraw some cash from my account.',
    prompt: 'Você quer sacar dinheiro.',
    expected: 'I’d like to withdraw some cash.'
  },
  {
    id: 'b2-bank-fee',
    level: 'B2',
    situation: 'bank',
    casual: 'Why this charge?',
    natural: 'Could you explain this charge on my account?',
    meaning: 'Perguntar sobre cobrança com educação.',
    useWhen: 'Use quando aparece uma taxa desconhecida.',
    avoidWhen: 'Evite acusar antes de entender.',
    example: 'Could you explain this charge on my account? I don’t recognize it.',
    prompt: 'Você viu uma cobrança que não reconhece.',
    expected: 'Could you explain this charge on my account?'
  },
  {
    id: 'a1-delivery-address',
    level: 'A1',
    situation: 'delivery',
    casual: 'Address is wrong.',
    natural: 'The address is wrong.',
    meaning: 'Avisar problema no endereço.',
    useWhen: 'Use em aplicativo, ligação ou mensagem com entregador.',
    avoidWhen: 'Não mande só o endereço sem explicar o erro.',
    example: 'The address is wrong. The correct number is 25.',
    prompt: 'O endereço do pedido saiu errado.',
    expected: 'The address is wrong.'
  },
  {
    id: 'b1-delivery-late',
    level: 'B1',
    situation: 'delivery',
    casual: 'My order is late.',
    natural: 'My order is running late. Is there an update?',
    meaning: 'Perguntar sobre atraso sem soar rude.',
    useWhen: 'Use quando o pedido passou do horário.',
    avoidWhen: 'Evite começar culpando o entregador.',
    example: 'My order is running late. Is there an update on the delivery?',
    prompt: 'Seu pedido está atrasado e você quer uma atualização.',
    expected: 'My order is running late. Is there an update?'
  },
  {
    id: 'b2-delivery-missing',
    level: 'B2',
    situation: 'delivery',
    casual: 'Something missing in order.',
    natural: 'There seems to be an item missing from my order.',
    meaning: 'Relatar item faltando com naturalidade.',
    useWhen: 'Use no suporte do delivery.',
    avoidWhen: 'Evite frase incompleta sem "there seems to be".',
    example: 'There seems to be an item missing from my order. Could you check it?',
    prompt: 'Chegou o pedido, mas um item está faltando.',
    expected: 'There seems to be an item missing from my order.'
  },
  {
    id: 'a1-gym-signup',
    level: 'A1',
    situation: 'gym',
    casual: 'I want gym.',
    natural: 'I’d like to sign up for the gym.',
    meaning: 'Pedir matrícula na academia.',
    useWhen: 'Use na recepção da academia.',
    avoidWhen: 'Evite "I want gym", que soa incompleto.',
    example: 'Hi, I’d like to sign up for the gym.',
    prompt: 'Você quer se matricular numa academia.',
    expected: 'I’d like to sign up for the gym.'
  },
  {
    id: 'a2-gym-machine',
    level: 'A2',
    situation: 'gym',
    casual: 'How use this?',
    natural: 'Could you show me how to use this machine?',
    meaning: 'Pedir ajuda com equipamento.',
    useWhen: 'Use com instrutor ou funcionário.',
    avoidWhen: 'Evite mexer em aparelho sem saber.',
    example: 'Could you show me how to use this machine safely?',
    prompt: 'Você não sabe usar um aparelho da academia.',
    expected: 'Could you show me how to use this machine?'
  },
  {
    id: 'b2-gym-routine',
    level: 'B2',
    situation: 'gym',
    casual: 'I need plan for muscle.',
    natural: 'I’m looking for a workout plan to build muscle.',
    meaning: 'Explicar objetivo de treino.',
    useWhen: 'Use com personal trainer ou instrutor.',
    avoidWhen: 'Evite "plan for muscle", que soa traduzido.',
    example: 'I’m looking for a workout plan to build muscle without hurting my back.',
    prompt: 'Você quer explicar seu objetivo de ganhar massa muscular.',
    expected: 'I’m looking for a workout plan to build muscle.'
  },
  {
    id: 'a1-friendship-invite',
    level: 'A1',
    situation: 'friendship',
    casual: 'You want coffee?',
    natural: 'Do you want to grab a coffee?',
    meaning: 'Convite casual e natural.',
    useWhen: 'Use com amigo, colega ou date informal.',
    avoidWhen: 'Evite em contexto formal de trabalho.',
    example: 'Do you want to grab a coffee after class?',
    prompt: 'Você quer convidar alguém para tomar café.',
    expected: 'Do you want to grab a coffee?'
  },
  {
    id: 'b1-friendship-plans',
    level: 'B1',
    situation: 'friendship',
    casual: 'What your plans?',
    natural: 'What are you up to later?',
    meaning: 'Perguntar planos de forma casual.',
    useWhen: 'Use para puxar conversa ou combinar algo.',
    avoidWhen: 'Evite se a pessoa não deu abertura.',
    example: 'What are you up to later? I might go downtown.',
    prompt: 'Você quer saber os planos de alguém para mais tarde.',
    expected: 'What are you up to later?'
  },
  {
    id: 'c1-friendship-support',
    level: 'C1',
    situation: 'friendship',
    casual: 'I understand your problem.',
    natural: 'That sounds really frustrating. I’m here if you want to talk.',
    meaning: 'Mostrar apoio emocional de forma natural.',
    useWhen: 'Use quando alguém desabafa com você.',
    avoidWhen: 'Evite tentar resolver tudo rápido demais.',
    example: 'That sounds really frustrating. I’m here if you want to talk.',
    prompt: 'Um amigo contou uma situação difícil e você quer apoiar.',
    expected: 'I’m here if you want to talk.'
  }
];

function getLevelIndex(level: EnglishLevel) {
  return levelOrder.indexOf(level);
}

function resolveLevel(xp: number) {
  const reached = APP_LEVELS.filter((level) => xp >= level.xpNeeded).at(-1);
  return reached ? Math.min(reached.level + 1, APP_LEVELS.length) : 1;
}

function getDailyPhraseWeight(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}:${id}`.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getRecommendedPhrases(userLevel: EnglishLevel, situation: NativeSituationId) {
  const currentIndex = getLevelIndex(userLevel);
  return nativePhrases
    .filter((phrase) => phrase.situation === situation)
    .sort((a, b) => {
      const levelDistance = Math.abs(getLevelIndex(a.level) - currentIndex) - Math.abs(getLevelIndex(b.level) - currentIndex);
      if (levelDistance !== 0) return levelDistance;
      const levelOrderDistance = getLevelIndex(a.level) - getLevelIndex(b.level);
      if (levelOrderDistance !== 0) return levelOrderDistance;
      return getDailyPhraseWeight(a.id) - getDailyPhraseWeight(b.id);
    });
}

function readBadNativeVideos(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_error) {
    return [];
  }
}

function readSavedNativeVideos(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.id && item?.query && item?.lang && item?.date)
      : [];
  } catch (_error) {
    return [];
  }
}

function readNativeSearchHistory(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.query && item?.lang && item?.date)
      : [];
  } catch (_error) {
    return [];
  }
}

function normalizePracticeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparePracticeText(expectedValue: string, receivedValue: string) {
  const expectedWords = normalizePracticeText(expectedValue).split(' ').filter(Boolean);
  const receivedWords = normalizePracticeText(receivedValue).split(' ').filter(Boolean);
  const remaining = [...receivedWords];
  const matched = expectedWords.filter((word) => {
    const index = remaining.indexOf(word);
    if (index === -1) return false;
    remaining.splice(index, 1);
    return true;
  });
  const missing = expectedWords.filter((word) => !matched.includes(word));
  const score = expectedWords.length ? Math.round((matched.length / expectedWords.length) * 100) : 0;

  return {
    score,
    missing: [...new Set(missing)].slice(0, 6),
    extra: [...new Set(remaining)].slice(0, 6)
  };
}

export function NativesTab({ user, onProfileRefresh }: NativesTabProps) {
  const englishLevel = normalizeEnglishLevel(user.english_level);
  const [query, setQuery] = useState('look forward to');
  const [lang, setLang] = useState<NativesLanguage>('english');
  const [result, setResult] = useState<NativesSearchResult | null>(null);
  const [activeVideo, setActiveVideo] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [selectedSituation, setSelectedSituation] = useState<NativeSituationId>('restaurant');
  const [selectedPhraseId, setSelectedPhraseId] = useState(nativePhrases[0].id);
  const [answer, setAnswer] = useState('');
  const [coachResult, setCoachResult] = useState<NativeCoachResult | null>(null);
  const [coachError, setCoachError] = useState('');
  const [isCoaching, setIsCoaching] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [shadowMessage, setShadowMessage] = useState('');
  const [dictationAnswer, setDictationAnswer] = useState('');
  const [dictationMessage, setDictationMessage] = useState('');
  const [savedVideoMessage, setSavedVideoMessage] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [practiceHistory, setPracticeHistory] = useState<NativePracticeHistoryItem[]>([]);
  const [badVideoIds, setBadVideoIds] = useState<string[]>([]);
  const [savedVideos, setSavedVideos] = useState<NativeSavedVideo[]>([]);
  const [searchHistory, setSearchHistory] = useState<NativeSearchHistoryItem[]>([]);

  const favoriteKey = `linguafire:natives-favorites:${user.id}`;
  const historyKey = `linguafire:natives-history:${user.id}`;
  const savedVideosKey = `linguafire:natives-saved-videos:${user.id}`;
  const searchHistoryKey = `linguafire:natives-search-history:${user.id}`;
  const activeSearchQuery = (lastQuery || query).trim();
  const badVideoKey = `linguafire:natives-bad-videos:${lang}:${activeSearchQuery}`;
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedSituationData = nativeSituations.find((item) => item.id === selectedSituation) || nativeSituations[0];
  const recommendedPhrases = useMemo(
    () => getRecommendedPhrases(englishLevel, selectedSituation),
    [englishLevel, selectedSituation]
  );
  const selectedPhrase = nativePhrases.find((phrase) => phrase.id === selectedPhraseId) || recommendedPhrases[0] || nativePhrases[0];
  const favoritePhrases = nativePhrases.filter((phrase) => favorites.includes(phrase.id));
  const visibleVideoIds = (result?.videoIds || []).filter((id) => !badVideoIds.includes(id));
  const completedNativePhrases = useMemo(
    () => new Set((user.achievements || []).filter((achievement) => achievement.startsWith('native-phrase-'))),
    [user.achievements]
  );
  const savedCurrentPhrase = completedNativePhrases.has(`native-phrase-${selectedPhrase.id}`);
  const nativeCompletedCount = completedNativePhrases.size;
  const todayHistory = practiceHistory.filter((item) => item.date.startsWith(todayKey));
  const dailyGoalProgress = Math.min(100, Math.round((todayHistory.length / nativeDailyGoal) * 100));
  const bestTodayScore = todayHistory.reduce((best, item) => Math.max(best, item.score), 0);
  const recentHistory = practiceHistory.slice(0, 5);
  const activeVideoSaved = savedVideos.some((item) => item.id === activeVideo);
  const recentSavedVideos = savedVideos.slice(0, 6);
  const recentSearches = searchHistory.slice(0, 8);
  const recommendedReviewPhrases = useMemo(() => {
    const completed = completedNativePhrases;
    const unseen = nativePhrases
      .filter((phrase) => getLevelIndex(phrase.level) <= getLevelIndex(englishLevel) + 1)
      .filter((phrase) => !completed.has(`native-phrase-${phrase.id}`))
      .slice(0, 6);
    const favoriteReview = favoritePhrases.slice(0, 3);
    return [...favoriteReview, ...unseen]
      .filter((phrase, index, items) => items.findIndex((candidate) => candidate.id === phrase.id) === index)
      .slice(0, 6);
  }, [completedNativePhrases, englishLevel, favoritePhrases]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(favoriteKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setFavorites(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
    } catch (_error) {
      setFavorites([]);
    }
  }, [favoriteKey]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(historyKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setPracticeHistory(Array.isArray(parsed) ? parsed.filter((item) => item?.phraseId && item?.date) : []);
    } catch (_error) {
      setPracticeHistory([]);
    }
  }, [historyKey]);

  useEffect(() => {
    setBadVideoIds(readBadNativeVideos(badVideoKey));
  }, [badVideoKey]);

  useEffect(() => {
    setSavedVideos(readSavedNativeVideos(savedVideosKey));
    getSavedNativeVideos()
      .then((videos) => {
        setSavedVideos(videos);
        window.localStorage.setItem(savedVideosKey, JSON.stringify(videos));
      })
      .catch(() => undefined);
  }, [savedVideosKey]);

  useEffect(() => {
    setSearchHistory(readNativeSearchHistory(searchHistoryKey));
  }, [searchHistoryKey]);

  useEffect(() => {
    const next = recommendedPhrases[0];
    if (next) {
      setSelectedPhraseId(next.id);
      setAnswer('');
      setCoachResult(null);
      setCoachError('');
    }
  }, [recommendedPhrases]);

  function saveFavorites(nextFavorites: string[]) {
    setFavorites(nextFavorites);
    window.localStorage.setItem(favoriteKey, JSON.stringify(nextFavorites));
  }

  function savePracticeHistory(item: NativePracticeHistoryItem) {
    const nextHistory = [item, ...practiceHistory]
      .filter((historyItem, index, items) => items.findIndex((candidate) => candidate.id === historyItem.id) === index)
      .slice(0, 60);
    setPracticeHistory(nextHistory);
    window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
  }

  function saveNativeVideos(nextVideos: NativeSavedVideo[]) {
    setSavedVideos(nextVideos);
    window.localStorage.setItem(savedVideosKey, JSON.stringify(nextVideos));
  }

  function saveSearchHistory(item: NativeSearchHistoryItem) {
    const nextHistory = [item, ...searchHistory]
      .filter((historyItem, index, items) => (
        items.findIndex((candidate) => candidate.query.toLowerCase() === historyItem.query.toLowerCase() && candidate.lang === historyItem.lang) === index
      ))
      .slice(0, 24);
    setSearchHistory(nextHistory);
    window.localStorage.setItem(searchHistoryKey, JSON.stringify(nextHistory));
  }

  async function toggleSavedVideo() {
    if (!activeVideo || !activeSearchQuery) return;

    setSavedVideoMessage('');
    const exists = savedVideos.some((item) => item.id === activeVideo);
    const nextVideos = exists
      ? savedVideos.filter((item) => item.id !== activeVideo)
      : [
          {
            id: activeVideo,
            query: activeSearchQuery,
            lang,
            date: new Date().toISOString()
          },
          ...savedVideos
        ]
          .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
          .slice(0, 40);

    saveNativeVideos(nextVideos);

    try {
      if (exists) {
        await deleteSavedNativeVideo(activeVideo);
        setSavedVideoMessage('Vídeo removido da sua biblioteca.');
      } else {
        await saveNativeVideo({ query: activeSearchQuery, lang, videoId: activeVideo });
        setSavedVideoMessage('Vídeo salvo na sua conta.');
      }
    } catch (_error) {
      setSavedVideoMessage('Salvo neste navegador. Rode a migration para sincronizar na conta.');
    }
  }

  function toggleFavorite(phraseId: string) {
    const nextFavorites = favorites.includes(phraseId)
      ? favorites.filter((id) => id !== phraseId)
      : [...favorites, phraseId];
    saveFavorites(nextFavorites);
  }

  function completeShadowPractice(rounds = 1) {
    const score = rounds >= 3 ? 88 : rounds === 2 ? 78 : 68;
    const xp = rounds >= 3 ? 10 : rounds === 2 ? 8 : 5;
    setShadowMessage(rounds >= 3
      ? `Sequência completa: você treinou ritmo, pausa e entonação.`
      : `Bom começo. Faça ${3 - rounds} rodada(s) a mais para fixar "${selectedPhrase.natural}".`);
    savePracticeHistory({
      id: `shadow-${selectedPhrase.id}-${Date.now()}`,
      phraseId: selectedPhrase.id,
      situation: selectedPhrase.situation,
      level: selectedPhrase.level,
      score,
      xp,
      date: new Date().toISOString(),
      natural: selectedPhrase.natural
    });
  }

  function checkDictation() {
    const expected = normalizePracticeText(selectedPhrase.natural);
    const received = normalizePracticeText(dictationAnswer);
    if (!received) {
      setDictationMessage('Ouça a frase e escreva o que você entendeu.');
      return;
    }

    const comparison = comparePracticeText(selectedPhrase.natural, dictationAnswer);

    if (received === expected || comparison.score >= 92) {
      setDictationMessage(`Perfeito: ${comparison.score}%. Você escreveu a frase natural corretamente.`);
      savePracticeHistory({
        id: `dictation-${selectedPhrase.id}-${Date.now()}`,
        phraseId: selectedPhrase.id,
        situation: selectedPhrase.situation,
        level: selectedPhrase.level,
        score: 95,
        xp: 8,
        date: new Date().toISOString(),
        natural: selectedPhrase.natural
      });
      return;
    }

    setDictationMessage([
      `Resultado: ${comparison.score}%.`,
      comparison.missing.length ? `Faltou: ${comparison.missing.join(', ')}.` : '',
      comparison.extra.length ? `Sobrou: ${comparison.extra.join(', ')}.` : '',
      `Correto: ${selectedPhrase.natural}`
    ].filter(Boolean).join(' '));
  }

  function speakText(text: string, rate = 0.86) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'english-uk' ? 'en-GB' : lang === 'english-au' ? 'en-AU' : 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }

  async function performSearch(nextQuery = query, nextLang = lang) {
    const trimmed = nextQuery.trim();
    if (!trimmed || isSearching) return;

    setIsSearching(true);
    setError('');
    setSavedVideoMessage('');
    setResult(null);
    setActiveVideo('');
    setLastQuery(trimmed);
    setQuery(trimmed);

    try {
      const data = await searchNatives(trimmed, nextLang);
      setResult(data);
      const badIds = readBadNativeVideos(`linguafire:natives-bad-videos:${nextLang}:${trimmed}`);
      setBadVideoIds(badIds);
      setActiveVideo((data.videoIds || []).find((id) => !badIds.includes(id)) || '');
      saveSearchHistory({ query: trimmed, lang: nextLang, date: new Date().toISOString() });
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Erro ao buscar vídeos.');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleCoachSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || isCoaching) return;

    setIsCoaching(true);
    setCoachError('');
    setCoachResult(null);
    setProgressMessage('');
    try {
      const data = await coachNativeReply({
        situationId: selectedSituation,
        englishLevel,
        prompt: selectedPhrase.prompt,
        target: selectedPhrase.natural,
        answer: trimmed
      });
      setCoachResult(data);
    } catch (coachRequestError) {
      setCoachError(coachRequestError instanceof Error ? coachRequestError.message : 'Erro ao treinar resposta.');
    } finally {
      setIsCoaching(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    performSearch();
  }

  async function saveNativeProgress() {
    if (!coachResult || isSavingProgress) return;

    const nextAchievements = new Set(user.achievements || []);
    const completedAchievement = `native-phrase-${selectedPhrase.id}`;
    const wasAlreadyCompleted = nextAchievements.has(completedAchievement);
    const isStrongAnswer = coachResult.score >= 80;
    const earnedXp = wasAlreadyCompleted ? Math.max(4, Math.round(coachResult.score / 18)) : Math.max(10, Math.round(coachResult.score / 4));

    nextAchievements.add(completedAchievement);
    if (isStrongAnswer) {
      nextAchievements.add(`native-strong-${selectedPhrase.id}`);
    }

    const nextXp = Number(user.xp || 0) + earnedXp;
    const nextUser: UserProfile = {
      ...user,
      xp: nextXp,
      level: Math.max(Number(user.level || 1), resolveLevel(nextXp)),
      correct_answers: Number(user.correct_answers || 0) + (isStrongAnswer ? 1 : 0),
      achievements: Array.from(nextAchievements)
    };

    try {
      setIsSavingProgress(true);
      setProgressMessage('');
      await updateProfile({
        xp: nextUser.xp,
        level: nextUser.level,
        correct_answers: nextUser.correct_answers,
        achievements: nextUser.achievements
      });
      savePracticeHistory({
        id: `${selectedPhrase.id}-${Date.now()}`,
        phraseId: selectedPhrase.id,
        situation: selectedPhrase.situation,
        level: selectedPhrase.level,
        score: coachResult.score,
        xp: earnedXp,
        date: new Date().toISOString(),
        natural: selectedPhrase.natural
      });
      onProfileRefresh(nextUser);
      setProgressMessage(wasAlreadyCompleted ? `Treino repetido salvo. +${earnedXp} XP` : `Progresso salvo. +${earnedXp} XP`);
    } catch (error) {
      setProgressMessage(error instanceof Error ? error.message : 'Não foi possível salvar o progresso.');
    } finally {
      setIsSavingProgress(false);
    }
  }

  function markActiveVideoAsBad() {
    if (!activeVideo) return;

    const nextBadIds = [...new Set([...badVideoIds, activeVideo])];
    setBadVideoIds(nextBadIds);
    window.localStorage.setItem(badVideoKey, JSON.stringify(nextBadIds));

    const nextVideo = (result?.videoIds || []).find((id) => id !== activeVideo && !nextBadIds.includes(id)) || '';
    setActiveVideo(nextVideo);
    reportBadNativeVideo({
      query: activeSearchQuery,
      lang,
      videoId: activeVideo,
      reason: 'bad_result'
    });
  }

  function restoreBadVideosForSearch() {
    if (!result) return;

    setBadVideoIds([]);
    window.localStorage.removeItem(badVideoKey);
    setActiveVideo(result.videoIds?.[0] || '');
  }

  const fallbackUrl = result?.searchUrl || buildNativesFallbackUrl(lastQuery || query, lang);
  const retryVariants = buildRetryVariants(lastQuery || query);

  return (
    <section className="natives-layout" aria-label="Nativos">
      <header className="natives-hero">
        <p className="kicker">Nativos</p>
        <h1>Treine inglês real por situação</h1>
        <p className="lead">
          Frases naturais, contexto, áudio, favoritos e correção com IA para o seu nível {englishLevel}.
        </p>
        <div className="native-progress-strip" aria-label="Progresso em Nativos">
          <span>{nativeCompletedCount}</span>
          <strong>frases treinadas</strong>
          <small>{user.xp || 0} XP total</small>
        </div>
        <div className="native-daily-panel">
          <div>
            <span>Meta diária</span>
            <strong>{todayHistory.length}/{nativeDailyGoal}</strong>
            <small>{bestTodayScore ? `melhor score hoje: ${bestTodayScore}` : 'treine 3 frases hoje'}</small>
          </div>
          <div className="progress-track" aria-label={`Meta diária ${dailyGoalProgress}%`}>
            <div style={{ width: `${dailyGoalProgress}%` }} />
          </div>
        </div>
      </header>

      <section className="native-section">
        <div className="panel-heading">
          <div>
            <p className="kicker">Situações reais</p>
            <h2>Escolha onde você quer falar melhor</h2>
          </div>
          <span>{selectedSituationData.title}</span>
        </div>
        <div className="native-situation-grid">
          {nativeSituations.map((situation) => (
            <button
              className={selectedSituation === situation.id ? 'active' : ''}
              key={situation.id}
              type="button"
              onClick={() => setSelectedSituation(situation.id)}
            >
              <span>{situation.icon}</span>
              <strong>{situation.title}</strong>
              <small>{situation.copy}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="native-pack-row" aria-label="Pacotes prontos">
        {nativePacks.map((pack) => (
          <button key={pack.id} type="button" onClick={() => setSelectedSituation(pack.situation)}>
            <span>Pacote</span>
            <strong>{pack.title}</strong>
            <small>{pack.copy}</small>
          </button>
        ))}
      </section>

      <section className="native-workbench">
        <div className="native-library">
          <div className="panel-heading">
            <div>
              <p className="kicker">Como um nativo diria</p>
              <h2>{selectedSituationData.title}</h2>
            </div>
            <span>{recommendedPhrases.length} frases</span>
          </div>
          <div className="native-phrase-list">
            {recommendedPhrases.map((phrase) => (
              <button
                className={selectedPhrase.id === phrase.id ? 'active' : ''}
                key={phrase.id}
                type="button"
                onClick={() => {
                  setSelectedPhraseId(phrase.id);
                  setAnswer('');
                  setDictationAnswer('');
                  setCoachResult(null);
                  setCoachError('');
                  setShadowMessage('');
                  setDictationMessage('');
                  setProgressMessage('');
                }}
              >
                <span className="level-pill">{phrase.level}</span>
                <strong>{phrase.natural}</strong>
                <small>{completedNativePhrases.has(`native-phrase-${phrase.id}`) ? 'Treinada' : phrase.meaning}</small>
              </button>
            ))}
          </div>
        </div>

        <article className="native-practice-panel">
          <div className="native-compare">
            <div>
              <span>Frase traduzida</span>
              <strong>{selectedPhrase.casual}</strong>
            </div>
            <div>
              <span>Natural</span>
              <strong>{selectedPhrase.natural}</strong>
            </div>
          </div>

          <div className="native-explain-grid">
            <div>
              <span>Quando usar</span>
              <p>{selectedPhrase.useWhen}</p>
            </div>
            <div>
              <span>Evite</span>
              <p>{selectedPhrase.avoidWhen}</p>
            </div>
            <div>
              <span>Exemplo</span>
              <p>{selectedPhrase.example}</p>
            </div>
          </div>

          <div className="native-actions">
            <button type="button" onClick={() => speakText(selectedPhrase.natural)}>Ouvir pronúncia</button>
            <button type="button" onClick={() => toggleFavorite(selectedPhrase.id)}>
              {favorites.includes(selectedPhrase.id) ? 'Remover favorito' : 'Favoritar'}
            </button>
            <button type="button" onClick={() => performSearch(selectedPhrase.natural)}>Ver vídeo real</button>
          </div>

          <section className="native-drill-grid" aria-label="Treinos rápidos">
            <article>
              <span>Modo sombra</span>
              <strong>{selectedPhrase.natural}</strong>
              <p>Ouça, pause e repita junto tentando copiar ritmo e entonação.</p>
              <div>
                <button type="button" onClick={() => speakText(selectedPhrase.natural, 0.68)}>Lento</button>
                <button type="button" onClick={() => speakText(selectedPhrase.natural, 0.9)}>Natural</button>
                <button type="button" onClick={() => completeShadowPractice(3)}>Concluir</button>
              </div>
              {shadowMessage && <small>{shadowMessage}</small>}
            </article>

            <article>
              <span>Ditado</span>
              <strong>Escreva o que ouviu</strong>
              <p>Toque o áudio, escreva a frase e compare com o inglês natural.</p>
              <input
                className="field"
                placeholder="Digite a frase ouvida..."
                value={dictationAnswer}
                onChange={(event) => setDictationAnswer(event.target.value)}
              />
              <div>
                <button type="button" onClick={() => speakText(selectedPhrase.natural)}>Tocar áudio</button>
                <button type="button" onClick={checkDictation}>Corrigir ditado</button>
              </div>
              {dictationMessage && <small>{dictationMessage}</small>}
            </article>
          </section>

          <form className="native-coach" onSubmit={handleCoachSubmit}>
            <label htmlFor="native-answer">Treino com IA</label>
            <p>{selectedPhrase.prompt}</p>
            <textarea
              id="native-answer"
              placeholder="Escreva sua resposta em inglês..."
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            {coachError && <div className="form-error">{coachError}</div>}
            <button className="primary-button" disabled={isCoaching || !answer.trim()} type="submit">
              {isCoaching ? 'Corrigindo...' : 'Avaliar naturalidade'}
            </button>
          </form>

          {coachResult && (
            <section className="native-score-card">
              <div className="panel-heading">
                <h3>{coachResult.score}/100</h3>
                <span>naturalidade</span>
              </div>
              <div className="native-score-track">
                <span style={{ width: `${Math.max(0, Math.min(100, coachResult.score))}%` }} />
              </div>
              <p><strong>Correção:</strong> {coachResult.correction}</p>
              <p><strong>Mais natural:</strong> {coachResult.natural}</p>
              <p><strong>Feedback:</strong> {coachResult.feedback}</p>
              <p><strong>Próxima resposta:</strong> {coachResult.nextReply}</p>
              <button className="primary-button" disabled={isSavingProgress} type="button" onClick={saveNativeProgress}>
                {isSavingProgress ? 'Salvando...' : savedCurrentPhrase ? 'Salvar treino repetido' : 'Salvar progresso'}
              </button>
              {progressMessage && <div className="form-success">{progressMessage}</div>}
            </section>
          )}
        </article>
      </section>

      {favoritePhrases.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <h2>Favoritos</h2>
            <span>{favoritePhrases.length}</span>
          </div>
          <div className="native-favorites">
            {favoritePhrases.map((phrase) => (
              <button
                key={phrase.id}
                type="button"
                onClick={() => {
                  setSelectedSituation(phrase.situation);
                  setSelectedPhraseId(phrase.id);
                }}
              >
                <span>{phrase.level}</span>
                <strong>{phrase.natural}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      {recommendedReviewPhrases.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Revisão diária</p>
              <h2>Recomendadas para hoje</h2>
            </div>
            <span>{recommendedReviewPhrases.length}</span>
          </div>
          <div className="native-review-grid">
            {recommendedReviewPhrases.map((phrase) => (
              <button
                key={phrase.id}
                type="button"
                onClick={() => {
                  setSelectedSituation(phrase.situation);
                  setSelectedPhraseId(phrase.id);
                  setAnswer('');
                  setDictationAnswer('');
                  setCoachResult(null);
                  setCoachError('');
                  setShadowMessage('');
                  setDictationMessage('');
                  setProgressMessage('');
                }}
              >
                <span>{phrase.level}</span>
                <strong>{phrase.natural}</strong>
                <small>{phrase.meaning}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {recentHistory.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Histórico</p>
              <h2>Últimos treinos salvos</h2>
            </div>
            <span>{practiceHistory.length}</span>
          </div>
          <div className="native-history-list">
            {recentHistory.map((item) => {
              const situation = nativeSituations.find((nativeSituation) => nativeSituation.id === item.situation);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedSituation(item.situation);
                    setSelectedPhraseId(item.phraseId);
                    setProgressMessage('');
                  }}
                >
                  <span>{item.score}/100</span>
                  <strong>{item.natural}</strong>
                  <small>{situation?.title || 'Nativos'} · {item.level} · +{item.xp} XP</small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="native-section">
        <div className="panel-heading">
          <div>
            <p className="kicker">Vídeos reais</p>
            <h2>Busque a expressão no contexto</h2>
          </div>
        </div>
        <form className="natives-search" onSubmit={handleSubmit}>
          <input
            className="field"
            id="nativesInput"
            placeholder="Ex: look forward to"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select value={lang} onChange={(event) => setLang(event.target.value as NativesLanguage)}>
            {nativeLanguages.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button className="primary-button" disabled={isSearching || !query.trim()} id="nativesSearchBtn" type="submit">
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <div className="suggestion-tags">
          {nativeSuggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => performSearch(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {recentSearches.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Recentes</p>
              <h2>Buscas anteriores</h2>
            </div>
            <span>{searchHistory.length}</span>
          </div>
          <div className="native-search-history">
            {recentSearches.map((item) => (
              <button
                key={`${item.lang}-${item.query}`}
                type="button"
                onClick={() => {
                  setLang(item.lang);
                  performSearch(item.query, item.lang);
                }}
              >
                <strong>{item.query}</strong>
                <small>{item.lang}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <div className="form-error">{error}</div>}

      {activeVideo && (
        <section className="natives-result">
          <div className="panel-heading">
            <h2>{lastQuery}</h2>
            <span>{result?.curated ? 'curado' : result?.cached ? 'cache' : 'novo'}</span>
          </div>
          <div className="video-frame">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              id="nativesIframe"
              src={`https://www.youtube-nocookie.com/embed/${activeVideo}?rel=0&modestbranding=1`}
              title={`Native result for ${lastQuery}`}
            />
          </div>
          <div className="native-video-actions">
            <button type="button" onClick={toggleSavedVideo}>
              {activeVideoSaved ? 'Remover salvo' : 'Salvar vídeo'}
            </button>
            <button type="button" onClick={markActiveVideoAsBad}>
              Vídeo ruim
            </button>
            <a href={`https://www.youtube.com/watch?v=${activeVideo}`} rel="noopener noreferrer" target="_blank">
              Abrir no YouTube
            </a>
            <small>Não mostrar de novo para esta busca.</small>
          </div>
          {savedVideoMessage && <div className="form-success">{savedVideoMessage}</div>}
          {visibleVideoIds.length > 1 && (
            <div className="native-thumbs">
              {visibleVideoIds.map((id) => (
                <button className={activeVideo === id ? 'active' : ''} key={id} type="button" onClick={() => setActiveVideo(id)}>
                  <img alt="" src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {recentSavedVideos.length > 0 && (
        <section className="native-section">
          <div className="panel-heading">
            <div>
              <p className="kicker">Biblioteca</p>
              <h2>Vídeos salvos</h2>
            </div>
            <span>{savedVideos.length}</span>
          </div>
          <div className="native-saved-videos">
            {recentSavedVideos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => {
                  setLastQuery(video.query);
                  setQuery(video.query);
                  setLang(video.lang);
                  setResult({
                    videoIds: [video.id],
                    cached: true,
                    message: 'Vídeo salvo'
                  });
                  setActiveVideo(video.id);
                }}
              >
                <img alt="" src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} />
                <span>{video.lang}</span>
                <strong>{video.query}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      {result && !activeVideo && (
        <section className="natives-fallback">
          <span>Modo nativo</span>
          <h2>Refine a busca aqui dentro</h2>
          <p>
            {badVideoIds.length > 0 && (result.videoIds || []).length > 0
              ? 'Todos os vídeos encontrados para essa busca foram marcados como ruins.'
              : result.reason === 'providers_unavailable'
                ? 'A busca automática não conseguiu consultar os provedores agora. Use a busca pronta abaixo ou tente novamente em alguns segundos.'
                : result.message || 'Nenhum vídeo confiável encontrado para essa expressão.'}
          </p>
          <strong>"{lastQuery}"</strong>
          <div className="suggestion-tags">
            {badVideoIds.length > 0 && (result.videoIds || []).length > 0 && (
              <button type="button" onClick={restoreBadVideosForSearch}>
                Restaurar vídeos desta busca
              </button>
            )}
            {retryVariants.map((variant) => (
              <button key={variant} type="button" onClick={() => performSearch(variant)}>
                {variant}
              </button>
            ))}
          </div>
          <a className="secondary-link" href={fallbackUrl} rel="noopener noreferrer" target="_blank">
            Abrir busca exata no YouTube Shorts
          </a>
        </section>
      )}
    </section>
  );
}
