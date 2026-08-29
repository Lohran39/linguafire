const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registerSchema, loginSchema, changePasswordSchema, resetPasswordSchema, forgotPasswordSchema, validateBody } = require('../validation');
const { getCookieToken, setAuthCookie, clearAuthCookie } = require('../utils/auth');
const { verifyEmailCanReceiveMail: defaultVerifyEmailCanReceiveMail } = require('../utils/email-verifier');

const router = express.Router();

function setupAuthRoutes(app, deps = {}) {
  const {
    supabaseGetUserByEmail = async () => null,
    supabaseGetUserById = async () => null,
    supabaseCreateUser = async () => ({ error: 'not configured' }),
    supabaseSetPasswordResetToken = async () => ({ error: 'not configured' }),
    supabaseGetUserByResetToken = async () => null,
    supabaseResetPassword = async () => ({ error: 'not configured' }),
    JWT_SECRET = 'dev-secret',
    BASE_URL = 'http://localhost:3000',
    IS_PRODUCTION = false,
    sendPasswordResetEmail = async () => {},
    sendWelcomeEmail = async () => {},
    isPasswordResetEmailConfigured = () => !!process.env.SMTP_HOST,
    isTransactionalEmailConfigured = () => !!process.env.SMTP_HOST,
    logger = console,
    parseJsonField = (value, fallback) => fallback,
    verifyEmailCanReceiveMail = defaultVerifyEmailCanReceiveMail
  } = deps;

  // Register
  app.post('/api/register', validateBody(registerSchema), async (req, res) => {
    const { name, email, password } = req.validatedBody;

    try {
      const canReceiveMail = await verifyEmailCanReceiveMail(email);
      if (!canReceiveMail) {
        return res.status(400).json({ error: 'Use um email valido que consiga receber mensagens.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await supabaseCreateUser({ name, email, password: hashedPassword });

      if (result.error) {
        if (result.error.includes('UNIQUE') || result.error.includes('duplicate')) {
          return res.status(400).json({ error: 'Este email já está cadastrado' });
        }
        logger.error?.('Failed to create Supabase user', { error: result.error });
        return res.status(500).json({ error: 'Erro ao criar conta' });
      }

      const userId = result.data.id;
      const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);

      if (isTransactionalEmailConfigured()) {
        sendWelcomeEmail(email, name).catch((emailErr) => {
          logger.error?.('Failed to send welcome email', { error: emailErr.message });
        });
      }

      res.json({
        success: true,
        user: {
          id: userId, name, email,
          level: 1, xp: 0, streak: 0,
          correct_answers: 0, lessons_completed: 0,
          english_level: 'A1',
          achievements: [],
          favorites: [],
          titles: [],
          google_linked: false,
          theme: 'default',
          subscription_active: false,
          subscription_expires: 0,
          ai_uses_today: 0,
          lives: 5,
          has_free_hint: 0,
          xp_multiplier: 1,
          xp_multiplier_until: 0
        }
      });
    } catch (error) {
      logger.error?.('Unexpected register error', { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Login
  app.post('/api/login', validateBody(loginSchema), async (req, res) => {
    const { email, password } = req.validatedBody;

    try {
      const user = await supabaseGetUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou senha incorretos' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);

      res.json({
        success: true,
        user: {
          id: user.id, name: user.name, email: user.email,
          level: user.level, xp: user.xp, streak: user.streak,
          correct_answers: user.correct_answers, lessons_completed: user.lessons_completed,
          english_level: user.english_level,
          achievements: parseJsonField(user.achievements, []),
          favorites: parseJsonField(user.favorites, []),
          titles: parseJsonField(user.titles, []),
          google_linked: !!user.google_id,
          theme: user.theme || 'default',
          subscription_active: !!user.subscription_active,
          subscription_expires: user.subscription_expires || 0,
          ai_uses_today: user.ai_uses_today || 0,
          lives: user.lives || 5,
          has_free_hint: user.has_free_hint || 0,
          xp_multiplier: user.xp_multiplier || 1,
          xp_multiplier_until: user.xp_multiplier_until || 0
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Forgot password
  app.post('/api/auth/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
    const { email } = req.validatedBody;

    try {
      const user = await supabaseGetUserByEmail(email);
      if (!user) {
        return res.json({ success: true, message: 'Se o email existir, você receberá um link para redefinir a senha' });
      }

      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = Date.now() + 60 * 60 * 1000;

      const result = await supabaseSetPasswordResetToken(user.id, resetToken, resetExpires);
      if (result.error) {
        logger.error?.('Failed to store password reset token', { error: result.error });
        return res.status(500).json({ error: 'Erro ao gerar token de recuperação' });
      }

      const resetUrl = `${BASE_URL}/reset-password?token=${resetToken}`;

      if (isPasswordResetEmailConfigured()) {
        try {
          await sendPasswordResetEmail(email, resetUrl, user.name);
        } catch (emailErr) {
          logger.error?.('Failed to send password reset email', { error: emailErr.message });
          return res.status(500).json({ error: 'Erro ao enviar email de recuperação' });
        }
      } else if (!IS_PRODUCTION && process.env.ALLOW_DEV_RESET_LINK === 'true') {
        logger.info?.('Password reset link generated in development mode');
      } else if (IS_PRODUCTION) {
        logger.error?.('Password reset email requested without email provider configured');
        return res.status(500).json({ error: 'Email de recuperação não configurado' });
      }

      res.json({
        success: true,
        message: 'Se o email existir, você receberá um link para redefinir a senha',
        resetLink: !IS_PRODUCTION && process.env.ALLOW_DEV_RESET_LINK === 'true' ? resetUrl : null
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Reset password
  app.post('/api/auth/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
    const { token, newPassword } = req.validatedBody;

    try {
      const user = await supabaseGetUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
      }

      if (user.password_reset_expires < Date.now()) {
        return res.status(400).json({ error: 'Token expirado. Solicite um novo link.' });
      }

      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ error: 'A nova senha não pode ser igual à senha atual.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const result = await supabaseResetPassword(user.id, hashedPassword);
      if (result.error) {
        return res.status(500).json({ error: 'Erro ao redefinir senha' });
      }

      res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Get session
  app.get('/api/auth/session', (req, res) => {
    const token = getCookieToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      res.json({ userId: decoded.id, email: decoded.email });
    } catch (err) {
      return res.status(403).json({ error: 'Sessão inválida' });
    }
  });

  // Logout
  app.post('/api/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  // Change password
  app.put('/api/change-password', validateBody(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.validatedBody;
    const token = getCookieToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const { data, error } = await deps.supabase
        .from('users')
        .select('password')
        .eq('id', decoded.id)
        .single();

      if (error || !data) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      const validPassword = await bcrypt.compare(currentPassword, data.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await deps.supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', decoded.id);

      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao alterar senha' });
    }
  });
}

module.exports = { setupAuthRoutes };
