const { profileUpdateSchema, validateBody } = require('../validation');

function setupProfileRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetUserById = async () => null,
    supabaseUpdateUser = async () => ({ error: 'not configured' }),
    parseJsonField = (v, f) => f
  } = deps;

  // Get profile
  app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        user: {
          ...user,
          achievements: parseJsonField(user.achievements, []),
          favorites: parseJsonField(user.favorites, []),
          titles: parseJsonField(user.titles, []),
          google_linked: !!user.google_id,
          theme: user.theme || 'default',
          subscription_active: !!user.subscription_active,
          subscription_expires: user.subscription_expires || 0,
          plan: user.plan || (user.subscription_active ? 'pro' : 'free'),
          ai_daily_limit: user.ai_daily_limit || 10,
          ai_uses_today: user.ai_uses_today || 0,
          ai_uses_date: user.ai_uses_date || ''
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Update profile
  app.put('/api/profile', authenticateToken, validateBody(profileUpdateSchema), async (req, res) => {
    try {
      const updates = {};
      const allowed = ['name', 'level', 'xp', 'streak', 'correct_answers', 'lessons_completed', 'english_level', 'placement_completed', 'achievements', 'favorites', 'theme'];

      for (const key of allowed) {
        if (req.validatedBody[key] !== undefined) {
          if (key === 'achievements' || key === 'favorites') {
            updates[key] = JSON.stringify(req.validatedBody[key]);
          } else {
            updates[key] = req.validatedBody[key];
          }
        }
      }

      await supabaseUpdateUser(req.user.id, updates);
      res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  });
}

module.exports = { setupProfileRoutes };
