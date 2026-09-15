const { publicProfile } = require('../utils/public-profile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { isVerified, sessionIsCurrent, sessionClaims } = require('../utils/auth-security');
const { registerSchema, loginSchema, changePasswordSchema, resetPasswordSchema, forgotPasswordSchema, validateBody } = require('../validation');
const { getCookieToken, setAuthCookie, clearAuthCookie } = require('../utils/auth');


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
    supabaseRestoreEmailVerificationToken = async () => ({ error: 'not configured' }),
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
    parseJsonField = (value, fallback) => fallback
  } = deps;

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
      try {
        await sendEmailVerificationEmail(user.email, verifyUrl, user.name);
      } catch (error) {
        const restored = await supabaseRestoreEmailVerificationToken(user.id, verificationToken, user);
        if (restored.error) logger.error?.('Failed to restore previous verification link');
        throw error;
      }
    }

    return verifyUrl;
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
      const existingUser = await supabaseGetUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Este email já está cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await supabaseCreateUser({
        name,
        email,
        password: hashedPassword,
        email_verified: 1,
        email_verified_at: Date.now(),
        email_verification_token: '',
        email_verification_expires: 0
      });

      if (result.error) {
        if (result.error.includes('UNIQUE') || result.error.includes('duplicate')) {
          return res.status(400).json({ error: 'Este email já está cadastrado' });
        }
        logger.error?.('Failed to create Supabase user', { error: result.error });
        return res.status(500).json({ error: 'Erro ao criar conta' });
      }

      const user = result.data;
      setAuthCookie(res, jwt.sign(sessionClaims(user), JWT_SECRET, { expiresIn: '7d' }));
      res.status(201).json({ success: true, user: publicProfile(user, parseJsonField) });
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

      const token = jwt.sign(sessionClaims(user), JWT_SECRET, { expiresIn: '7d' });
      setAuthCookie(res, token);

      res.json({
        success: true,
        user: publicProfile(user, parseJsonField)
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    const token = String(req.query.token || '');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!/^[a-f0-9]{64}$/.test(token)) return res.redirect(`${BASE_URL}/?error=email_verification_invalid`);
    // Mail scanners may open GET links. Activation requires an explicit action.
    return res.redirect(`${BASE_URL}/#confirm-email=${token}`);
  });

  app.post('/api/auth/verify-email', validateBody(resetPasswordSchema), async (req, res) => {
    const { token, newPassword } = req.validatedBody;

    try {
      const user = await supabaseGetUserByEmailVerificationToken(token);
      if (!user || isVerified(user)) return res.status(400).json({ error: 'Link inválido ou já utilizado. Solicite uma nova confirmação.' });
      if (Number(user.email_verification_expires || 0) < Date.now()) {
        return res.status(400).json({ error: 'O link expirou. Solicite uma nova confirmação.' });
      }

      // The inbox owner chooses the final password, replacing any password
      // someone else might have supplied when registering their address.
      const password = await bcrypt.hash(newPassword, 10);
      const result = await supabaseVerifyUserEmail(user.id, token, password);
      if (result.error) {
        logger.error?.('Failed to verify email', { error: result.error });
        return res.status(400).json({ error: 'Não foi possível confirmar. Solicite um novo link.' });
      }

      if (isTransactionalEmailConfigured()) {
        sendWelcomeEmail(user.email, user.name).catch((emailErr) => {
          logger.error?.('Failed to send welcome email after verification', { error: emailErr.message });
        });
      }

      return res.json({ success: true, message: 'E-mail confirmado! Entre com sua senha.' });
    } catch (error) {
      logger.error?.('Unexpected email verification error', { error: error.message });
      return res.status(500).json({ error: 'Não foi possível confirmar. Tente novamente.' });
    }
  });

  app.post('/api/auth/resend-verification', validateBody(forgotPasswordSchema), async (req, res) => {
    const { email } = req.validatedBody;

    try {
      const user = await supabaseGetUserByEmail(email);
      if (!user || isVerified(user)) {
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
      const result = await supabaseResetPassword(user.id, hashedPassword, token);
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
      if (!user || !sessionIsCurrent(decoded, user)) {
        clearAuthCookie(res);
        return res.status(401).json({ error: 'Não autenticado' });
      }
      if (!isVerified(user)) {
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
        .select('password,email_verified,auth_version')
        .eq('id', decoded.id)
        .single();

      if (error || !data) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!isVerified(data) || !sessionIsCurrent(decoded, data)) {
        clearAuthCookie(res);
        return res.status(403).json({ error: 'Confirme seu email antes de entrar.' });
      }

      const validPassword = await bcrypt.compare(currentPassword, data.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const authVersion = Date.now();
      const { error: updateError, data: updated } = await deps.supabase
        .from('users')
        .update({ password: hashedPassword, auth_version: authVersion })
        .eq('id', decoded.id).eq('password', data.password).select('id').maybeSingle();
      if (updateError || !updated) return res.status(409).json({ error: 'Não foi possível alterar a senha. Tente novamente.' });
      setAuthCookie(res, jwt.sign(sessionClaims({ ...decoded, auth_version: authVersion }), JWT_SECRET, { expiresIn: '7d' }));

      res.json({ success: true, message: 'Senha alterada com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao alterar senha' });
    }
  });
}

module.exports = { setupAuthRoutes };
