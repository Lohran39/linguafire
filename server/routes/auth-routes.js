const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
    supabaseGetUserByEmailVerificationToken = async () => null,
    supabaseSetEmailVerificationToken = async () => ({ error: 'not configured' }),
    supabaseVerifyUserEmail = async () => ({ error: 'not configured' }),
    JWT_SECRET = 'dev-secret',
    BASE_URL = 'http://localhost:3000',
    IS_PRODUCTION = false,
    sendPasswordResetEmail = async () => {},
    sendEmailVerificationEmail = async () => {},
    sendWelcomeEmail = async () => {},
    isPasswordResetEmailConfigured = () => !!process.env.SMTP_HOST,
    isTransactionalEmailConfigured = () => !!process.env.SMTP_HOST,
    logger = console,
    parseJsonField = (value, fallback) => fallback,
    verifyEmailCanReceiveMail = defaultVerifyEmailCanReceiveMail
  } = deps;

  function buildDefaultUserPayload(user) {
    return {
      id: user.id, name: user.name, email: user.email,
      level: user.level ?? 1, xp: user.xp ?? 0, streak: user.streak ?? 0,
      correct_answers: user.correct_answers ?? 0, lessons_completed: user.lessons_completed ?? 0,
      english_level: user.english_level || 'A1',
      placement_completed: user.placement_completed ?? 0,
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
    };
  }

  async function sendVerificationForUser(user) {
    if (!isTransactionalEmailConfigured()) {
      if (IS_PRODUCTION) {
        throw new Error('Email de confirmação não configurado');
      }
      logger.info?.('Email confirmation link generated without email provider in development mode');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${verificationToken}`;

    const updateResult = await supabaseSetEmailVerificationToken(user.id, verificationToken, verificationExpires);
    if (updateResult.error) {
      logger.error?.('Failed to store email verification token', { error: updateResult.error });
      throw new Error('Erro ao gerar confirmação de email');
    }

    if (isTransactionalEmailConfigured()) {
      await sendEmailVerificationEmail(user.email, verifyUrl, user.name);
    }

    return verifyUrl;
  }

  function emailVerificationResponse(verificationUrl) {
    return {
      success: true,
      requiresEmailVerification: true,
      message: 'Enviamos um link de confirmação para seu email. Confirme antes de entrar.',
      verificationLink: !IS_PRODUCTION && process.env.ALLOW_DEV_EMAIL_CONFIRMATION_LINK === 'true' ? verificationUrl : null
    };
  }

  function getPublicEmailError(error, fallback) {
    const message = String(error?.message || '');
    if (
      message.includes('Resend ainda está em modo teste') ||
      message.includes('demorou demais') ||
      message.includes('Não foi possível conectar ao Resend') ||
      message.includes('precisa estar configurado') ||
      message.includes('não configurado')
    ) {
      return message;
    }
    return fallback;
  }

  // Register
  app.post('/api/register', validateBody(registerSchema), async (req, res) => {
    const { name, email, password } = req.validatedBody;

    try {
      const canReceiveMail = await verifyEmailCanReceiveMail(email);
      if (!canReceiveMail) {
        return res.status(400).json({ error: 'Use um email valido que consiga receber mensagens.' });
      }

      const existingUser = await supabaseGetUserByEmail(email);
      if (existingUser) {
        if (Number(existingUser.email_verified ?? 1) === 0) {
          try {
            const verificationUrl = await sendVerificationForUser(existingUser);
            return res.json(emailVerificationResponse(verificationUrl));
          } catch (emailErr) {
            logger.error?.('Failed to resend email verification', { error: emailErr.message });
            return res.status(500).json({ error: getPublicEmailError(emailErr, 'Erro ao enviar confirmação de email') });
          }
        }
        return res.status(400).json({ error: 'Este email já está cadastrado' });
      }

      if (!isTransactionalEmailConfigured() && IS_PRODUCTION) {
        logger.error?.('Registration requested without transactional email provider configured');
        return res.status(500).json({ error: 'Email de confirmação não configurado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
      const result = await supabaseCreateUser({
        name,
        email,
        password: hashedPassword,
        email_verified: 0,
        email_verified_at: 0,
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires
      });

      if (result.error) {
        if (result.error.includes('UNIQUE') || result.error.includes('duplicate')) {
          return res.status(400).json({ error: 'Este email já está cadastrado' });
        }
        logger.error?.('Failed to create Supabase user', { error: result.error });
        return res.status(500).json({ error: 'Erro ao criar conta' });
      }

      const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${verificationToken}`;

      if (isTransactionalEmailConfigured()) {
        try {
          await sendEmailVerificationEmail(email, verifyUrl, name);
        } catch (emailErr) {
          logger.error?.('Failed to send email verification', { error: emailErr.message });
          return res.status(500).json({ error: getPublicEmailError(emailErr, 'Erro ao enviar confirmação de email') });
        }
      } else {
        logger.info?.('Email confirmation link generated in development mode');
      }

      res.json(emailVerificationResponse(verifyUrl));
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

      if (Number(user.email_verified ?? 1) === 0) {
        return res.status(403).json({ error: 'Confirme seu email antes de entrar.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);

      res.json({
        success: true,
        user: buildDefaultUserPayload(user)
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    const token = String(req.query.token || '');
    if (!token) return res.redirect(`${BASE_URL}/?error=email_verification_invalid`);

    try {
      const user = await supabaseGetUserByEmailVerificationToken(token);
      if (!user) return res.redirect(`${BASE_URL}/?error=email_verification_invalid`);
      if (Number(user.email_verification_expires || 0) < Date.now()) {
        return res.redirect(`${BASE_URL}/?error=email_verification_expired`);
      }

      const result = await supabaseVerifyUserEmail(user.id);
      if (result.error) {
        logger.error?.('Failed to verify email', { error: result.error });
        return res.redirect(`${BASE_URL}/?error=email_verification_failed`);
      }

      const authToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, authToken);

      if (isTransactionalEmailConfigured()) {
        sendWelcomeEmail(user.email, user.name).catch((emailErr) => {
          logger.error?.('Failed to send welcome email after verification', { error: emailErr.message });
        });
      }

      return res.redirect(`${BASE_URL}/?auth=email_verified&placement=1`);
    } catch (error) {
      logger.error?.('Unexpected email verification error', { error: error.message });
      return res.redirect(`${BASE_URL}/?error=email_verification_failed`);
    }
  });

  app.post('/api/auth/resend-verification', validateBody(forgotPasswordSchema), async (req, res) => {
    const { email } = req.validatedBody;

    try {
      const user = await supabaseGetUserByEmail(email);
      if (!user || Number(user.email_verified ?? 1) !== 0) {
        return res.json({ success: true, message: 'Se a conta estiver pendente, enviaremos um novo link de confirmação.' });
      }

      const verificationUrl = await sendVerificationForUser(user);
      res.json({
        success: true,
        message: 'Se a conta estiver pendente, enviaremos um novo link de confirmação.',
        verificationLink: !IS_PRODUCTION && process.env.ALLOW_DEV_EMAIL_CONFIRMATION_LINK === 'true' ? verificationUrl : null
      });
    } catch (error) {
      logger.error?.('Failed to resend email verification', { error: error.message });
      res.status(500).json({ error: getPublicEmailError(error, 'Erro ao reenviar confirmação de email') });
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
          return res.status(500).json({ error: getPublicEmailError(emailErr, 'Erro ao enviar email de recuperação') });
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
  app.get('/api/auth/session', async (req, res) => {
    const token = getCookieToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await supabaseGetUserById(decoded.id);
      if (!user) {
        clearAuthCookie(res);
        return res.status(401).json({ error: 'Não autenticado' });
      }
      if (Number(user.email_verified ?? 1) === 0) {
        clearAuthCookie(res);
        return res.status(403).json({ error: 'Confirme seu email antes de entrar.' });
      }
      res.json({ userId: decoded.id, email: decoded.email });
    } catch (err) {
      clearAuthCookie(res);
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
        .select('password,email_verified')
        .eq('id', decoded.id)
        .single();

      if (error || !data) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (Number(data.email_verified ?? 1) === 0) {
        clearAuthCookie(res);
        return res.status(403).json({ error: 'Confirme seu email antes de entrar.' });
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
