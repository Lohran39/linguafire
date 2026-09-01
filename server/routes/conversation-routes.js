const { conversationFormulateSchema, conversationSchema, grammarAnalyzeSchema, validateBody } = require('../validation');

const CONVERSATION_TOPICS = [
  {
    id: 'restaurant',
    name: '🍽️ Restaurante',
    role: 'waiter at a restaurant in New York',
    goal: 'take orders, answer menu questions, handle the bill and respond like a real waiter',
    scope: 'tables, menu, food, drinks, allergies, recommendations, orders, bill, payment and restaurant service',
    redirect: 'Let’s keep practicing at the restaurant. What would you like to order?'
  },
  {
    id: 'airport',
    name: '✈️ Aeroporto',
    role: 'airport check-in agent',
    goal: 'help with check-in, gate, boarding, luggage, delays and immigration questions',
    scope: 'check-in, boarding pass, passport, luggage, gate, delay, seat, security, immigration and connecting flights',
    redirect: 'Let’s stay at the airport. Do you need help with check-in, your gate, or your luggage?'
  },
  {
    id: 'job_interview',
    name: '💼 Entrevista de Emprego',
    role: 'job interviewer',
    goal: 'ask professional interview questions and react like a real interviewer',
    scope: 'experience, skills, strengths, weaknesses, salary, availability, teamwork, career goals and job responsibilities',
    redirect: 'Let’s stay in the job interview. Can you tell me about your experience?'
  },
  {
    id: 'small_talk',
    name: '💬 Conversa Casual',
    role: 'friendly native speaker',
    goal: 'keep a casual conversation about daily life, weather, hobbies and weekend plans',
    scope: 'daily life, weather, hobbies, food, plans, weekend, family-safe personal preferences and casual social questions',
    redirect: 'Let’s keep it casual. How has your day been?'
  },
  {
    id: 'shopping',
    name: '🛍️ Compras',
    role: 'shop assistant',
    goal: 'help with price, size, payment, returns and product suggestions',
    scope: 'products, price, sizes, colors, discounts, fitting rooms, payment, returns, exchanges and store recommendations',
    redirect: 'Let’s stay in the store. Are you looking for a size, a price, or a recommendation?'
  },
];

const LEVEL_GUIDES = {
  A1: 'Use very simple English, short sentences, present tense, and basic vocabulary. Ask one direct question at a time.',
  A2: 'Use simple English with everyday vocabulary, short replies, and common phrases. Correct only the most important mistakes.',
  B1: 'Use natural but clear English, everyday idioms, and follow-up questions. Keep corrections gentle and practical.',
  B2: 'Use more natural English with useful expressions, collocations, and slightly longer answers. Challenge the user moderately.',
  C1: 'Use advanced natural English, nuanced corrections, idioms, and richer vocabulary while staying concise.'
};

const FORMULATE_GUIDES = {
  A1: 'Write one very short answer with basic vocabulary.',
  A2: 'Write one short answer with a polite phrase and simple details.',
  B1: 'Write a natural answer with one useful connector.',
  B2: 'Write a confident answer with natural phrasing and context.',
  C1: 'Write a polished, idiomatic answer with nuance but keep it concise.'
};

const CONTEXT_LOCK_MESSAGE = 'This practice is locked because you kept leaving the scenario. Start a new situation to continue.';

function buildConversationSystemPrompt(topic, englishLevel) {
  return [
    `You are the ${topic.role}.`,
    `Your job: ${topic.goal}.`,
    `Allowed context: ${topic.scope}.`,
    `Student level: ${englishLevel}. ${LEVEL_GUIDES[englishLevel] || LEVEL_GUIDES.A1}`,
    'Stay in character for the whole conversation.',
    'Do not leave the selected scenario, even if the learner asks about another topic.',
    `If the learner goes off-topic, acknowledge briefly and redirect with this exact intention: ${topic.redirect}`,
    `If the learner insists on changing topic after being redirected, respond exactly: "${CONTEXT_LOCK_MESSAGE}"`,
    'When you send the lock message, do not answer the off-topic request and do not add any other sentence.',
    'Off-topic redirection must still be in English and in character.',
    'Reply directly to what the learner said. Do not ignore their message.',
    'If the learner writes incomplete English, infer the likely meaning and continue naturally.',
    'If the learner makes any grammar, spelling, word order, missing word, politeness, or naturalness mistake, always include one short correction.',
    'Correction format: "Quick correction: [correct sentence]." Then continue in character.',
    'If the learner writes a correct sentence, do not add a correction.',
    'Never answer with only punctuation, markdown, asterisks, ellipses, labels, JSON, or quotes.',
    'Do not say you are an AI. Do not explain the exercise.',
    'Do not answer unrelated requests, personal questions about the system, coding questions, politics, adult content, or anything outside the scenario.',
    'Keep the response useful for speaking practice: 1 to 3 short sentences.',
    'Always end with a natural follow-up question for the scenario.'
  ].join(' ');
}

function cleanConversationReply(content = '', fallback = 'Sure. How can I help you?') {
  const cleaned = String(content || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*assistant\s*:\s*/i, '')
    .replace(/^\s*reply\s*:\s*/i, '')
    .replace(/^\s*["'“”]+|["'“”]+\s*$/g, '')
    .replace(/\*{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || /^[\s.*"']+$/.test(cleaned) || cleaned.length < 3) return fallback;
  return cleaned.slice(0, 700);
}

function getTopicFallback(topic) {
  return topic?.redirect || 'Let’s keep practicing this situation. How can I help you?';
}

function setupConversationRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    checkAILimit = (req, res, next) => next(),
    callMiniMaxChat = async () => ({ content: '' }),
    OPENAI_MODEL_ALIAS = 'gemini-3.6-flash',
    AI_API_KEY = ''
  } = deps;

  // Get topics
  app.get('/api/conversation/topics', (req, res) => {
    res.json({ topics: CONVERSATION_TOPICS });
  });

  // Send message
  app.post('/api/conversation', authenticateToken, checkAILimit, validateBody(conversationSchema), async (req, res) => {
    const { topicId, message, history = [], englishLevel = 'A1' } = req.validatedBody;
    const topic = CONVERSATION_TOPICS.find(t => t.id === topicId);
    if (!topic) return res.status(400).json({ error: 'Tópico inválido' });

    const messages = [
      { role: 'system', content: buildConversationSystemPrompt(topic, englishLevel) },
      ...history.slice(-10),
      { role: 'user', content: message }
    ];

    try {
      const result = await callMiniMaxChat({
        messages,
        temperature: 0.55,
        maxTokens: 180,
        requestedModel: OPENAI_MODEL_ALIAS,
        apiKey: AI_API_KEY || ''
      });

      res.json({ reply: cleanConversationReply(result.content, getTopicFallback(topic)) });
    } catch (error) {
      res.status(error.status || 502).json({ error: error.message || 'Erro na conversa com IA' });
    }
  });

  app.post('/api/conversation/formulate', authenticateToken, checkAILimit, validateBody(conversationFormulateSchema), async (req, res) => {
    const { topicId, history = [], englishLevel = 'A1' } = req.validatedBody;
    const topic = CONVERSATION_TOPICS.find(t => t.id === topicId);
    if (!topic) return res.status(400).json({ error: 'Tópico inválido' });

    const latestAssistantMessage = [...history].reverse().find(item => item.role === 'assistant')?.content || '';
    const messages = [
      {
        role: 'system',
        content: [
          'You formulate a response for an English learner inside LinguaFire.',
          `Scenario role: ${topic.role}.`,
          `Scenario goal: ${topic.goal}.`,
          `Allowed context: ${topic.scope}.`,
          `Student level: ${englishLevel}. ${FORMULATE_GUIDES[englishLevel] || FORMULATE_GUIDES.A1}`,
          'Return only the sentence the learner can say in English.',
          'Do not add explanations, labels, markdown, quotation marks, or translations.',
          'Make it sound natural for the scenario and directly answer the last assistant message.',
          'If the last message or current conversation is off-topic, formulate a sentence that redirects back to the selected scenario.'
        ].join(' ')
      },
      ...history.slice(-8),
      {
        role: 'user',
        content: latestAssistantMessage
          ? `Formulate my next response to this: ${latestAssistantMessage}`
          : 'Formulate a natural opening response for this scenario.'
      }
    ];

    try {
      const result = await callMiniMaxChat({
        messages,
        temperature: 0.45,
        maxTokens: 90,
        requestedModel: OPENAI_MODEL_ALIAS,
        apiKey: AI_API_KEY || ''
      });

      const suggestion = String(result.content || '').replace(/^["']|["']$/g, '').trim();
      res.json({ suggestion: suggestion || 'Could you help me, please?' });
    } catch (error) {
      res.status(error.status || 502).json({ error: error.message || 'Erro ao formular resposta com IA' });
    }
  });
}

function setupGrammarRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseAddGrammarError = async () => ({ error: 'not configured' }),
    callMiniMaxChat = async () => ({ content: '[]' }),
    OPENAI_MODEL_ALIAS = 'gemini-3.6-flash',
    AI_API_KEY = ''
  } = deps;

  // Analyze conversation
  app.post('/api/grammar/analyze', authenticateToken, validateBody(grammarAnalyzeSchema), async (req, res) => {
    const { conversationHistory, topicId } = req.validatedBody;

    const conversationText = conversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    if (!conversationText.trim()) {
      return res.json({ errors: [], message: 'No user messages to analyze' });
    }

    const topic = CONVERSATION_TOPICS.find(t => t.id === topicId);

    try {
      const analysisPrompt = `Analyze this English conversation for grammar errors. Focus on common mistakes like:
- Verb tense (past/present)
- Subject-verb agreement
- Preposition usage (in/on/at, since/for)
- Articles (a/an/the)
- Word order
- Common confusions (their/there/they're, your/you're, etc.)

Conversation topic: ${topic ? topic.name : 'General'}
Conversation:
${conversationText}

Respond ONLY with a JSON array of errors in this format (no other text):
[{"error": "specific error", "incorrect": "what user said", "correct": "correct form", "type": "error type"}]

If there are no obvious errors, respond with an empty array [].`;

      const result = await callMiniMaxChat({
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        maxTokens: 500,
        requestedModel: OPENAI_MODEL_ALIAS,
        apiKey: AI_API_KEY || ''
      });

      let errors = [];
      try {
        const content = result.content.trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          errors = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        // Silently ignore parse errors
      }

      if (errors.length > 0) {
        for (const err of errors) {
          await supabaseAddGrammarError(req.user.id, {
            topic: topicId || 'general',
            error_type: err.type || 'grammar',
            user_sentence: err.incorrect || '',
            correct_form: err.correct || ''
          });
        }
      }

      res.json({ success: true, errors, message: `Found ${errors.length} error(s)` });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao analisar gramática' });
    }
  });

  // Get grammar errors
  app.get('/api/grammar/errors', authenticateToken, async (req, res) => {
    try {
      const errors = await deps.supabaseGetGrammarErrors(req.user.id);
      res.json({ errors });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar erros' });
    }
  });

  // Get grammar stats
  app.get('/api/grammar/stats', authenticateToken, async (req, res) => {
    try {
      const errors = await deps.supabaseGetGrammarErrors(req.user.id);
      const uniqueTypes = new Set(errors.map(e => e.error_type).filter(Boolean));
      res.json({ total_errors: errors.length, unique_types: uniqueTypes.size });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });
}

module.exports = { setupConversationRoutes, setupGrammarRoutes, CONVERSATION_TOPICS };
