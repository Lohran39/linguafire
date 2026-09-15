import type { EnglishLevel } from './levels';

export type NativeSituationId =
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

export type NativeSituation = {
  id: NativeSituationId;
  title: string;
  copy: string;
  icon: string;
};

export type NativePhrase = {
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

export type NativePack = {
  id: string;
  title: string;
  copy: string;
  situation: NativeSituationId;
};

const levelOrder: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const nativeDailyGoal = 3;

export const nativeSituations: NativeSituation[] = [
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

export const nativePacks: NativePack[] = [
  { id: 'travel-start', title: 'Primeira viagem', copy: 'Aeroporto, hotel e pedidos básicos.', situation: 'airport' },
  { id: 'daily-social', title: 'Social diário', copy: 'Small talk, convite e resposta curta.', situation: 'small_talk' },
  { id: 'work-mode', title: 'Inglês de trabalho', copy: 'Reunião, entrevista e follow-up.', situation: 'meeting' },
  { id: 'safe-trip', title: 'Emergência fora do país', copy: 'Ajuda, localização e problema.', situation: 'emergency' },
  { id: 'health-basic', title: 'Saúde básica', copy: 'Farmácia, médico e sintomas.', situation: 'pharmacy' },
  { id: 'daily-life', title: 'Vida fora', copy: 'Banco, delivery, academia e amizade.', situation: 'delivery' }
];

export const nativePhrases: NativePhrase[] = [
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

export function getLevelIndex(level: EnglishLevel) {
  return levelOrder.indexOf(level);
}

function getDailyPhraseWeight(id: string) {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}:${id}`.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function getRecommendedPhrases(userLevel: EnglishLevel, situation: NativeSituationId) {
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

