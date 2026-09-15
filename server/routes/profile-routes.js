const express = require('express');
const { mutateUser, lessonXp } = require('../services/shop-benefits');
const { aiUsage } = require('../services/subscription-state');
const { publicProfile } = require('../utils/public-profile');
const { profileUpdateSchema, validateBody } = require('../validation');
const { detectedAvatarType, validateAvatar } = require('../utils/profile-avatar');

function setupProfileRoutes(app, deps = {}) {
  const {
    authenticateToken = (req, res, next) => next(),
    supabaseGetUserById = async () => null,
    supabaseUpdateUser = async () => ({ error: 'not configured' }),
    supabaseUploadProfileAvatar = async () => ({ error: 'not configured' }),
    supabaseGetProfileAvatar = async () => null,
    supabaseDeleteProfileAvatar = async () => ({ error: 'not configured' }),
    parseJsonField = (v, f) => f
  } = deps;

  app.get('/api/profile/avatar', authenticateToken, async (req, res) => {
    try {
      const avatar = await supabaseGetProfileAvatar(req.user.id);
      if (!avatar) return res.status(404).end();
      const bytes = Buffer.from(await avatar.arrayBuffer());
      const contentType = detectedAvatarType(bytes);
      if (!contentType) return res.status(404).end();
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'private, max-age=300');
      res.set('X-Content-Type-Options', 'nosniff');
      return res.send(bytes);
    } catch {
      return res.status(500).json({ error: 'Não foi possível carregar a foto.' });
    }
  });

  app.put('/api/profile/avatar', authenticateToken,
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '600kb' }), async (req, res) => {
      const validation = validateAvatar(req.body, req.headers['content-type']);
      if (validation.error) return res.status(400).json({ error: validation.error });
      const result = await supabaseUploadProfileAvatar(req.user.id, req.body, validation.contentType);
      if (result?.error) return res.status(500).json({ error: 'Não foi possível salvar a foto.' });
      return res.json({ success: true, avatarUrl: `/api/profile/avatar?v=${Date.now()}` });
    });

  app.delete('/api/profile/avatar', authenticateToken, async (req, res) => {
    const result = await supabaseDeleteProfileAvatar(req.user.id);
    if (result?.error) return res.status(500).json({ error: 'Não foi possível remover a foto.' });
    return res.json({ success: true });
  });

  // Get profile
  app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
      const user = await supabaseGetUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const usage = aiUsage(user);
      res.json({
        user: {
          ...publicProfile(user, parseJsonField),
          theme: user.theme || 'default',
          subscription_active: usage.plan !== 'free',
          subscription_expires: user.subscription_expires || 0,
          plan: usage.plan,
          ai_daily_limit: usage.limit,
          ai_monthly_limit: usage.monthlyLimit,
          ai_uses_month: usage.monthlyUsed,
          ai_month_resets_at: usage.monthlyResetsAt,
          ai_legacy: usage.legacy,
          ai_uses_today: usage.used,
          ai_limit_resets_at: usage.resetsAt,
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

      if (req.validatedBody.lesson_xp !== undefined || updates.xp !== undefined) {
        if (req.validatedBody.xp_base === undefined) return res.status(400).json({ error: 'Saldo inicial obrigatório.' });
        const result = await mutateUser(deps, req.user.id, user => {
          if (Number(user.xp || 0) !== req.validatedBody.xp_base) {
            const error = new Error('Seu saldo mudou. Atualize a página antes de salvar.'); error.status = 409; throw error;
          }
          const xp = req.validatedBody.lesson_xp !== undefined ? Number(user.xp || 0) + lessonXp(user, req.validatedBody.lesson_xp) : updates.xp;
          const level = Math.max(Number(user.level || 1), [200, 400, 700, 1200].filter(threshold => xp >= threshold).length + 1);
          return { updates: { ...updates, xp, level } };
        });
        return res.json({ success: true, updates: { xp: result.user.xp, level: result.user.level } });
      }
      const result = await supabaseUpdateUser(req.user.id, updates);
      if (result?.error) throw new Error(result.error);
      res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    } catch (error) {
      res.status(error.status || 500).json({ error: error.status ? error.message : 'Erro ao atualizar perfil' });
    }
  });
}

module.exports = { setupProfileRoutes };
