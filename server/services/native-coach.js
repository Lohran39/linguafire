const NATIVE_SITUATION_COACHES = {
  restaurant: 'voce e um atendente de restaurante nativo, educado, objetivo e focado em pedidos, conta, alergias e cardapio',
  airport: 'voce e um agente de aeroporto nativo, claro e direto, focado em portao, embarque, bagagem, seguranca e imigração',
  hotel: 'voce e uma recepcionista de hotel nativa, cordial e pratica, focada em check-in, reserva, problemas no quarto e pedidos',
  job_interview: 'voce e um entrevistador nativo, profissional e exigente, focado em respostas naturais para emprego',
  small_talk: 'voce e um amigo nativo, casual e natural, focado em conversa leve sem frases roboticas',
  shopping: 'voce e um atendente de loja nativo, util e natural, focado em preco, tamanho, troca, produto e pagamento',
  emergency: 'voce e um atendente de emergencia nativo, claro e calmo, focado em seguranca, localizacao e urgencia',
  meeting: 'voce e um colega de trabalho nativo, profissional e diplomatico, focado em reuniao, prazos e alinhamento'
};

const NATIVE_LEVEL_GUIDES = {
  A1: 'corrija com frases muito curtas, vocabulario basico e uma explicacao em portugues bem simples',
  A2: 'corrija com frases curtas, pedidos educados e explicacao pratica em portugues',
  B1: 'corrija naturalidade, preposicoes, ordem das palavras e escolha de expressao',
  B2: 'corrija tom, precisao, profissionalismo e alternativas mais naturais',
  C1: 'corrija nuance, registro, idiomaticidade e impacto da frase',
  C2: 'corrija sutileza, concisao, estilo, naturalidade e adequacao cultural'
};

const NATIVE_COACH_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    natural: { type: 'string' },
    feedback: { type: 'string' },
    correction: { type: 'string' },
    nextReply: { type: 'string' }
  },
  required: ['score', 'natural', 'feedback', 'correction', 'nextReply'],
  additionalProperties: false
};

function parseNativeCoachJson(content = '') {
  const raw = String(content || '').trim();
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;

  try {
    const parsed = JSON.parse(jsonText);
    if (!Number.isInteger(parsed.score) || parsed.score < 0 || parsed.score > 100) throw new Error('Invalid score');
    const result = { score: parsed.score };
    for (const [field, max] of Object.entries({ natural: 1500, feedback: 700, correction: 1500, nextReply: 1000 })) {
      if (typeof parsed[field] !== 'string' || !parsed[field].trim() || parsed[field].length > max) {
        throw new Error('Invalid feedback');
      }
      result[field] = parsed[field].trim();
    }
    return result;
  } catch (_error) {
    const error = new Error('Invalid native coach response');
    error.status = 502;
    error.code = 'invalid_ai_response';
    throw error;
  }
}

module.exports = {
  NATIVE_SITUATION_COACHES,
  NATIVE_LEVEL_GUIDES,
  NATIVE_COACH_RESPONSE_SCHEMA,
  parseNativeCoachJson
};
