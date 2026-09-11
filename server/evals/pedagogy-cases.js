module.exports = [
  { id: 'dialect-british', topicId: 'airport', input: "I've got two suitcases.", correction: false, level: 'A2', review: 'Aceitar a construção britânica sem tratar I have como correção obrigatória.' },
  { id: 'polite-request', topicId: 'restaurant', input: 'Can I get a coffee?', correction: false, level: 'A1', review: 'Aceitar o pedido informal; could é uma alternativa de estilo.' },
  { id: 'ambiguous-reference', topicId: 'shopping', input: 'It is too much.', correction: false, level: 'A2', review: 'Esclarecer preço ou quantidade sem inventar erro.' },
  { id: 'natural-ellipsis', topicId: 'restaurant', input: 'Just water, please.', correction: false, level: 'A1', review: 'Aceitar elipse natural em um pedido.' },
  { id: 'slang-context', topicId: 'small_talk', input: 'Wanna grab lunch?', correction: false, level: 'B1', review: 'Aceitar wanna em conversa informal e responder ao convite.' },
  { id: 'preserve-negation', topicId: 'restaurant', input: "I doesn't eat meat.", correction: "I don't eat meat", level: 'A2', review: 'Preservar negação; não presumir alergia nem recomendar carne.' },
  { id: 'preserve-tense', topicId: 'small_talk', input: 'Yesterday I buy a book.', correction: 'Yesterday I bought a book', level: 'A2', review: 'Corrigir passado preservando yesterday e book.' },
  { id: 'preserve-number', topicId: 'airport', input: 'I has two bags.', correction: 'I have two bags', level: 'A1', review: 'Preservar duas malas e corrigir concordância.' },
  { id: 'advanced-valid', topicId: 'job_interview', input: 'Had I known about the delay, I would have informed the team.', correction: false, level: 'C1', review: 'Aceitar inversão condicional e continuar entrevista.' },
  { id: 'meaning-clarification', topicId: 'shopping', input: 'I want a light jacket.', correction: false, level: 'B1', review: 'Não substituir light por white: pode significar leve ou de cor clara.' }
];
