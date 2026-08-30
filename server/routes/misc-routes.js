const DAILY_WORDS = [
  { word: 'Serendipity', translation: 'Feliz acaso / Encontrar algo bom sem procurar', level: 'C1', context: 'This word comes from the Persian fairy tale "The Three Princes of Serendip". Example: "Meeting her at that cafe was pure serendipity."' },
  { word: 'Petrichor', translation: 'O cheiro da terra molhada pela chuva', level: 'C1', context: 'Coined in 1964 by Australian researchers. Example: "I love the petrichor after a summer rain."' },
  { word: 'Hygge', translation: 'Conforto e bem-estar', level: 'B2', context: 'Danish concept of coziness. Example: "Let\'s have a hygge evening at home with candles."' },
  { word: 'Ephemeral', translation: 'Efêmero / Passageiro', level: 'B2', context: 'From Greek "ephemeros" meaning "lasting only a day". Example: "Social media fame is ephemeral."' },
  { word: 'Nostalgia', translation: 'Saudade do passado / Nostalgia', level: 'A2', context: 'Coined in 1688. Example: "Listening to old songs fills me with nostalgia."' }
];

const DEFAULT_QUESTS = [
  { id: 'daily_1', type: 'daily', title: 'Complete 2 lições', desc: 'Estude por pelo menos 2 vezes hoje', quest: 'lessons', target: 2, reward: 100 },
  { id: 'daily_2', type: 'daily', title: 'Acerte 10 respostas', desc: 'Acerte 10 exercícios corretos', quest: 'correct', target: 10, reward: 80 },
  { id: 'daily_3', type: 'daily', title: 'Faça 1 quiz de música', desc: 'Complete um quiz de música', quest: 'music_quiz', target: 1, reward: 60 },
  { id: 'weekly_1', type: 'weekly', title: 'Mantenha streak 5 dias', desc: 'Não perca sua sequência por 5 dias', quest: 'streak', target: 5, reward: 200 },
  { id: 'weekly_2', type: 'weekly', title: 'Acumule 500 XP', desc: 'Ganhe 500 XP na semana', quest: 'xp', target: 500, reward: 300 },
  { id: 'weekly_3', type: 'weekly', title: 'Complete 8 lições', desc: 'Faça 8 lições na semana', quest: 'lessons', target: 8, reward: 250 }
];

function setupMiscRoutes(app, deps = {}) {
  const {
    authenticateToken,
    clearAuthCookie,
    aiProvider = 'gemini',
    aiBaseUrl,
    aiModel,
    minimaxBaseUrl,
    minimaxModel,
    openaiModelAlias,
    activeFrontend = 'unknown',
    supabase,
    supabaseGetUserById,
    supabaseDeleteUser,
    monitoring,
    supabaseKeyRole = 'unknown',
    adminDashboardToken = ''
  } = deps;

  function getAdminToken(req) {
    return String(req.headers['x-admin-dashboard-token'] || req.headers['x-agent-admin-token'] || '').trim();
  }

  function requireAdmin(req, res, next) {
    if (!adminDashboardToken || getAdminToken(req) !== adminDashboardToken) {
      return res.status(403).json({ error: 'Token admin inválido ou não configurado' });
    }
    return next();
  }

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, xp, level, streak')
        .order('xp', { ascending: false })
        .limit(20);
      res.json({ leaderboard: data || [] });
    } catch (_error) {
      res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
  });

  app.get('/api/rank', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) return res.status(500).json({ error: 'Erro interno' });

      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('xp', user.xp);

      res.json({ rank: (count || 0) + 1 });
    } catch (_error) {
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  app.get('/api/daily/word', (_req, res) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    res.json(DAILY_WORDS[dayOfYear % DAILY_WORDS.length]);
  });

  app.get('/api/quests', authenticateToken, (_req, res) => {
    res.json({ quests: DEFAULT_QUESTS });
  });

  app.get('/api/admin/summary', authenticateToken, requireAdmin, async (_req, res) => {
    try {
      const [{ count: totalUsers }, { count: verifiedUsers }, { count: googleUsers }, topUsersResult, recentUsersResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('email_verified', 1),
        supabase.from('users').select('*', { count: 'exact', head: true }).not('google_id', 'is', null),
        supabase.from('users').select('id, name, email, xp, level, streak, english_level, placement_completed').order('xp', { ascending: false }).limit(10),
        supabase.from('users').select('id, name, email, xp, level, english_level, email_verified, placement_completed, created_at').order('created_at', { ascending: false }).limit(8)
      ]);

      res.json({
        stats: {
          totalUsers: totalUsers || 0,
          verifiedUsers: verifiedUsers || 0,
          googleUsers: googleUsers || 0,
          passwordUsers: Math.max((totalUsers || 0) - (googleUsers || 0), 0)
        },
        topUsers: topUsersResult.data || [],
        recentUsers: recentUsersResult.data || []
      });
    } catch (_error) {
      res.status(500).json({ error: 'Erro ao carregar painel admin' });
    }
  });

  app.get('/health', (_req, res) => {
    const providerBaseUrl = aiBaseUrl || minimaxBaseUrl;
    const providerModel = aiModel || minimaxModel;

    res.json({
      ok: true,
      ai_provider: aiProvider,
      ai_base: providerBaseUrl,
      ai_model: providerModel,
      minimax_base: providerBaseUrl,
      minimax_model: providerModel,
      supabase_key_role: supabaseKeyRole,
      frontend: activeFrontend,
      monitoring: monitoring?.snapshot?.() || null
    });
  });

  app.get('/models', (_req, res) => {
    const providerModel = aiModel || minimaxModel;

    res.json({
      object: 'list',
      data: [
        { id: openaiModelAlias, object: 'model', owned_by: 'proxy' },
        { id: providerModel, object: 'model', owned_by: 'proxy' }
      ]
    });
  });

  app.get('/v1/models', (_req, res) => {
    const providerModel = aiModel || minimaxModel;

    res.json({
      object: 'list',
      data: [
        { id: openaiModelAlias, object: 'model', owned_by: 'proxy' },
        { id: providerModel, object: 'model', owned_by: 'proxy' }
      ]
    });
  });

  app.delete('/api/account', authenticateToken, async (req, res) => {
    try {
      await supabaseDeleteUser(req.user.id);
      clearAuthCookie(res);
      res.json({ success: true, message: 'Conta deletada com sucesso' });
    } catch (_error) {
      res.status(500).json({ error: 'Erro ao deletar conta' });
    }
  });
}

module.exports = {
  DAILY_WORDS,
  DEFAULT_QUESTS,
  setupMiscRoutes
};
