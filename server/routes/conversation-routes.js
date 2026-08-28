const { conversationSchema, grammarAnalyzeSchema, validateBody } = require('../validation');

const CONVERSATION_TOPICS = [
  { id: 'restaurant', name: '🍽️ Restaurante', systemPrompt: 'You are a waiter at a restaurant in New York. Have a natural conversation with the user in English. Correct their grammar gently. Be friendly. Keep responses under 3 sentences.' },
  { id: 'airport', name: '✈️ Aeroporto', systemPrompt: 'You are an airport check-in agent. Help the user practice travel English. Correct grammar gently. Keep responses under 3 sentences.' },
  { id: 'job_interview', name: '💼 Entrevista de Emprego', systemPrompt: 'You are interviewing the user for a job. Ask questions, respond professionally. Correct grammar gently. Keep responses under 3 sentences.' },
  { id: 'small_talk', name: '💬 Conversa Casual', systemPrompt: 'You are a friendly native speaker having a casual chat. Discuss weather, hobbies, weekend plans. Correct grammar gently. Keep responses under 3 sentences.' },
  { id: 'shopping', name: '🛍️ Compras', systemPrompt: 'You are a shop assistant. Help the user practice shopping vocabulary. Correct grammar gently. Keep responses under 3 sentences.' },
];

const LEVEL_GUIDES = {
  A1: 'Use very simple English, short sentences, present tense, and basic vocabulary. Ask one direct question at a time.',
  A2: 'Use simple English with everyday vocabulary, short replies, and common phrases. Correct only the most important mistakes.',
  B1: 'Use natural but clear English, everyday idioms, and follow-up questions. Keep corrections gentle and practical.',
  B2: 'Use more natural English with useful expressions, collocations, and slightly longer answers. Challenge the user moderately.',
  C1: 'Use advanced natural English, nuanced corrections, idioms, and richer vocabulary while staying concise.'
};

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
      { role: 'system', content: `${topic.systemPrompt}\nStudent level: ${englishLevel}. ${LEVEL_GUIDES[englishLevel] || LEVEL_GUIDES.A1}` },
      ...history.slice(-10),
      { role: 'user', content: message }
    ];

    try {
      const result = await callMiniMaxChat({
        messages,
        temperature: 0.7,
        maxTokens: 150,
        requestedModel: OPENAI_MODEL_ALIAS,
        apiKey: AI_API_KEY || ''
      });

      res.json({ reply: result.content });
    } catch (error) {
      res.status(error.status || 502).json({ error: error.message || 'Erro na conversa com IA' });
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
