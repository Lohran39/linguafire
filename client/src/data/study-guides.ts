import type { EnglishLevel } from './levels';

export type GuidePage = { title: string; steps: [string, string, string]; tip: string };
export type StudyGuide = { label: string; usage?: boolean; pages: [GuidePage, ...GuidePage[]] };

export const studyGuides = {
  home: { label: 'Início', pages: [
    { title: 'Monte sua rotina', steps: ['Faça o nivelamento na aba Nível, se ainda não fez.', 'Comece com uma lição e revise algumas palavras.', 'Use o que aprendeu em uma conversa curta.'], tip: 'Dez minutos com atenção já são um bom começo.' },
    { title: 'Perceba seu progresso', steps: ['Volte aos exercícios que ainda geram dúvidas.', 'Observe as palavras revisadas e a prática por habilidade.', 'Escolha um objetivo pequeno para a próxima sessão.'], tip: 'O XP mede participação. O nivelamento indica seu nível de inglês.' }
  ] },
  lessons: { label: 'Lições', pages: [
    { title: 'Aprenda fazendo', steps: ['Escolha uma lição adequada ao seu nível.', 'Leia o enunciado e tente responder antes de consultar ajuda.', 'Confira a resposta e identifique o que precisa ajustar.'], tip: 'Na prática livre, erros não gastam vidas. No Desafio, cada erro custa 1 das suas 10 vidas.' },
    { title: 'Transforme erros em prática', steps: ['Escolha uma resposta que você errou.', 'Explique para si o motivo da correção.', 'Crie outra frase usando a mesma estrutura.'], tip: 'Na próxima sessão, tente de novo sem olhar a resposta anterior.' }
  ] },
  music: { label: 'Música', pages: [
    { title: 'Estude um trecho', steps: ['Escolha uma música e ouça um trecho curto.', 'Confira a letra e a tradução, quando disponíveis.', 'Pause e repita uma frase em voz alta.'], tip: 'Você não precisa entender a música inteira.' },
    { title: 'Escute mais uma vez', steps: ['Ouça o mesmo trecho sem acompanhar a letra.', 'Separe uma expressão e crie um exemplo seu.', 'Use o quiz disponível para conferir a compreensão.'], tip: 'Se houver problema no conteúdo, use “Informar problema”.' },
    { title: 'Ajuste o tempo da legenda', steps: ['Abra “Ajustar legenda” abaixo do vídeo.', 'Ao ouvir a primeira frase da letra, toque em “A primeira frase começa agora”.', 'Letra aparecendo antes da voz? Use “Atrasar 0,5 s”. Depois da voz? Use “Adiantar 0,5 s”.'], tip: '“Restaurar” remove o ajuste. Esses controles aparecem quando a letra tem marcações de tempo.' },
    { title: 'Pause só a legenda', steps: ['Dentro de “Ajustar legenda”, toque em “Pausar legenda” quando houver uma cena sem canto.', 'O vídeo continua tocando, mas a legenda fica na mesma frase.', 'Quando o canto voltar, toque em “Retomar legenda”: ela continua da frase pausada.'], tip: 'Para parar também o som e repetir uma frase em voz alta, pause o próprio vídeo.' }
  ] },
  flashcard: { label: 'Revisão', pages: [
    { title: 'Lembre antes de revelar', steps: ['Comece pelos cartões disponíveis para revisão.', 'Tente lembrar o significado antes de revelar a resposta.', 'Avalie com sinceridade o quanto conseguiu lembrar.'], tip: 'Reconhecer a resposta depois de vê-la não é o mesmo que lembrá-la.' },
    { title: 'Use a palavra', steps: ['Escolha uma palavra que foi difícil lembrar.', 'Crie uma frase curta com ela.', 'Volte para revisar em outro dia.'], tip: 'Distribua a revisão entre os dias em vez de concentrar tudo em uma sessão.' }
  ] },
  conversation: { label: 'Conversar', pages: [
    { title: 'Entre na conversa', steps: ['Escolha uma situação que faça sentido para você.', 'Responda em inglês usando o que já sabe.', 'Leia a resposta e faça uma pergunta para continuar.'], tip: 'Uma resposta curta é suficiente para começar.' },
    { title: 'Aproveite a correção', steps: ['Compare sua frase com a sugestão recebida.', 'Escolha um ajuste e use-o na próxima resposta.', 'Retome a mesma situação em outra sessão.'], tip: 'A IA pode errar. Se uma correção parecer estranha, confira com um professor ou fonte confiável.' }
  ] },
  natives: { label: 'Nativos', pages: [
    { title: 'Ouça inglês em contexto', steps: ['Escolha uma sugestão do seu nível ou busque uma expressão.', 'Assista a um trecho e observe como a expressão é usada.', 'Ouça novamente, pause e repita em voz alta.'], tip: 'Priorize entender o contexto antes de copiar a pronúncia.' },
    { title: 'Pratique a expressão', steps: ['Escolha uma expressão em “Explorar situações e expressões”.', 'Abra “Praticar” e escolha repetição, ditado ou conversa com IA.', 'Confira o retorno e tente novamente o ponto mais difícil.'], tip: 'A prática usa a frase indicada no botão; uma busca livre de vídeo não cria um novo exercício.' }
  ] },
  placement: { label: 'Nível', pages: [
    { title: 'Encontre seu ponto de partida', steps: ['Reserve alguns minutos para responder com atenção.', 'Tente responder sem tradutor ou ajuda de outra pessoa.', 'Use o resultado para escolher o próximo conteúdo.'], tip: 'O teste serve para orientar seus estudos; não é uma prova de valor pessoal.' },
    { title: 'Use o resultado', steps: ['Comece por atividades próximas do nível indicado.', 'Observe se consegue entender e responder com algum esforço.', 'Avance aos poucos e revise a base quando necessário.'], tip: 'Nivelamento e XP são medidas diferentes. O resultado não certifica proficiência.' }
  ] },
  shop: { label: 'Loja', usage: true, pages: [
    { title: 'Conheça os itens', steps: ['Confira seu saldo de XP.', 'Leia o benefício e o custo do item.', 'Escolha o item que combina com sua rotina.'], tip: 'Leia a descrição antes de usar seu XP.' },
    { title: 'Escolha com intenção', steps: ['Defina o que quer praticar nesta semana.', 'Veja se algum item ajuda nesse objetivo.', 'Depois, volte à atividade escolhida para estudar.'], tip: 'A loja é um complemento. A prática frequente é o que desenvolve suas habilidades.' }
  ] },
  profile: { label: 'Perfil', usage: true, pages: [
    { title: 'Cuide da sua conta', steps: ['Confira seus dados e preferências.', 'Ajuste as opções disponíveis para sua rotina.', 'Salve as alterações quando solicitado.'], tip: 'Use a mesma conta nos seus dispositivos para acessar o progresso sincronizado.' },
    { title: 'Assinatura e consumo', steps: ['Consulte seu plano e o consumo de IA no painel de assinatura.', 'Veja quando o limite será renovado.', 'Use “Gerenciar assinatura e cobranças”, quando disponível, para abrir o portal.'], tip: 'No portal de pagamentos você pode consultar cobranças, atualizar o cartão e gerenciar sua assinatura.' }
  ] },
  admin: { label: 'Admin', usage: true, pages: [
    { title: 'Acompanhe a operação', steps: ['Confira os indicadores e a atividade dos alunos.', 'Observe falhas e consumo dos provedores.', 'Investigue mudanças antes de tomar uma ação.'], tip: 'Compare períodos equivalentes ao analisar os indicadores.' },
    { title: 'Revise o conteúdo', steps: ['Abra as denúncias na curadoria.', 'Confira vídeo, texto e disponibilidade de tradução.', 'Registre o resultado da revisão.'], tip: 'Marque como verificado apenas o conteúdo que você realmente conferiu.' }
  ] }
} satisfies Record<string, StudyGuide>;

export type GuideTab = keyof typeof studyGuides;

const levelPractice: Record<EnglishLevel, Record<'listen' | 'recall' | 'speak', string>> = {
  A1: { listen: 'Ouça uma frase curta e identifique palavras familiares.', recall: 'Use uma palavra em uma frase simples sobre você.', speak: 'Diga seu nome, de onde é ou algo de que gosta em frases curtas.' },
  A2: { listen: 'Procure informações como lugar, horário e o que a pessoa quer.', recall: 'Use o conteúdo para descrever sua rotina ou algo que fez ontem.', speak: 'Simule um pedido de viagem e faça uma pergunta de continuação.' },
  B1: { listen: 'Ouça sem ler primeiro e resuma a ideia principal.', recall: 'Use a expressão para contar uma experiência e explicar o motivo.', speak: 'Conte uma experiência e acrescente uma opinião com um motivo.' },
  B2: { listen: 'Observe como o falante conecta ideias e dá ênfase às palavras.', recall: 'Compare expressões próximas e escolha a mais adequada ao contexto.', speak: 'Defenda uma opinião com exemplos e considere outro ponto de vista.' },
  C1: { listen: 'Observe intenção, nuances e mudanças entre linguagem formal e informal.', recall: 'Reformule a mesma ideia para uma conversa informal e um contexto profissional.', speak: 'Apresente um argumento com ressalvas e ajuste o tom ao interlocutor.' }
};

export function levelGuideTip(tab: GuideTab, level: EnglishLevel, assessed: boolean): string | null {
  if (['shop', 'profile', 'admin', 'placement'].includes(tab)) return null;
  if (!assessed) return 'Comece com frases curtas. Faça o teste na aba Nível para personalizar estas dicas.';
  const focus = tab === 'music' || tab === 'natives' ? 'listen' : tab === 'lessons' || tab === 'flashcard' ? 'recall' : 'speak';
  return levelPractice[level][focus];
}
