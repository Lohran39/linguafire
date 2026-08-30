const nodemailer = require('nodemailer');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createMailTransporter(env = process.env) {
  if (!env.SMTP_HOST) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    family: env.SMTP_FORCE_IPV4 === 'false' ? undefined : 4,
    connectionTimeout: Number(env.SMTP_TIMEOUT_MS || 10000),
    greetingTimeout: Number(env.SMTP_TIMEOUT_MS || 10000),
    socketTimeout: Number(env.SMTP_TIMEOUT_MS || 10000),
    auth: env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      : undefined
  });
}

function createPasswordResetMessage(to, resetUrl, name = '') {
  const safeName = String(name || 'aluno').trim();
  const safeHtmlName = escapeHtml(safeName);

  return {
    to,
    subject: 'Redefinir senha do LinguaFire',
    text: [
      `Olá, ${safeName}.`,
      '',
      'Recebemos uma solicitação para redefinir sua senha no LinguaFire.',
      `Acesse este link para criar uma nova senha: ${resetUrl}`,
      '',
      'Se você não solicitou isso, ignore este email.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Redefinir senha do LinguaFire</h2>
        <p>Olá, ${safeHtmlName}.</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#ff6a00;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Alterar senha</a></p>
        <p>Se você não solicitou isso, ignore este email.</p>
      </div>
    `
  };
}

function createWelcomeMessage(to, name = '') {
  const safeName = String(name || 'aluno').trim();
  const safeHtmlName = escapeHtml(safeName);

  return {
    to,
    subject: 'Bem-vindo ao LinguaFire',
    text: [
      `Olá, ${safeName}.`,
      '',
      'Sua conta no LinguaFire foi criada com sucesso.',
      'Você já pode começar sua trilha com música, contexto real e prática diária.',
      '',
      'Bons estudos!'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Bem-vindo ao LinguaFire</h2>
        <p>Olá, ${safeHtmlName}.</p>
        <p>Sua conta foi criada com sucesso.</p>
        <p>Você já pode começar sua trilha com música, contexto real e prática diária.</p>
        <p>Bons estudos!</p>
      </div>
    `
  };
}

function createEmailVerificationMessage(to, verifyUrl, name = '') {
  const safeName = String(name || 'aluno').trim();
  const safeHtmlName = escapeHtml(safeName);

  return {
    to,
    subject: 'Confirme seu email no LinguaFire',
    text: [
      `Olá, ${safeName}.`,
      '',
      'Para ativar sua conta no LinguaFire, confirme que este email é seu.',
      `Confirme acessando este link: ${verifyUrl}`,
      '',
      'Se você não criou uma conta, ignore este email.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Confirme seu email no LinguaFire</h2>
        <p>Olá, ${safeHtmlName}.</p>
        <p>Para ativar sua conta, confirme que este email é seu.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 18px;background:#ff6a00;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Confirmar email</a></p>
        <p>Se você não criou uma conta, ignore este email.</p>
      </div>
    `
  };
}

function isPasswordResetEmailConfigured(env = process.env) {
  return !!(env.RESEND_API_KEY || env.SMTP_HOST);
}

function isTransactionalEmailConfigured(env = process.env) {
  return !!(env.RESEND_API_KEY || env.SMTP_HOST);
}

async function sendWithResend(env, message) {
  const from = env.RESEND_FROM || env.SMTP_FROM || env.SMTP_USER;
  if (!from) {
    throw new Error('RESEND_FROM, SMTP_FROM ou SMTP_USER precisa estar configurado.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(env.EMAIL_TIMEOUT_MS || env.SMTP_TIMEOUT_MS || 15000));

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html
      })
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('O envio do email demorou demais. Confira a configuração do Resend e tente novamente.');
    }
    throw new Error('Não foi possível conectar ao Resend para enviar o email.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (err) {
      detail = response.statusText;
    }
    if (response.status === 403 && /testing emails|verify a domain|only send/i.test(detail)) {
      throw new Error('O Resend ainda está em modo teste. Verifique um domínio no Resend ou envie apenas para o email dono da conta Resend.');
    }
    throw new Error(`Resend recusou o envio (${response.status}): ${detail || response.statusText}`);
  }
}

function createMailService(env = process.env) {
  async function sendMessage(message) {
    if (env.RESEND_API_KEY) {
      await sendWithResend(env, message);
      return;
    }

    const transporter = createMailTransporter(env);
    if (!transporter) {
      throw new Error('Email de recuperação não configurado.');
    }

    const from = env.SMTP_FROM || env.SMTP_USER;
    if (!from) {
      throw new Error('SMTP_FROM ou SMTP_USER precisa estar configurado.');
    }

    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
  }

  async function sendPasswordResetEmail(to, resetUrl, name = '') {
    await sendMessage(createPasswordResetMessage(to, resetUrl, name));
  }

  async function sendWelcomeEmail(to, name = '') {
    await sendMessage(createWelcomeMessage(to, name));
  }

  async function sendEmailVerificationEmail(to, verifyUrl, name = '') {
    await sendMessage(createEmailVerificationMessage(to, verifyUrl, name));
  }

  return {
    sendPasswordResetEmail,
    sendEmailVerificationEmail,
    sendWelcomeEmail,
    isPasswordResetEmailConfigured: () => isPasswordResetEmailConfigured(env),
    isTransactionalEmailConfigured: () => isTransactionalEmailConfigured(env)
  };
}

module.exports = {
  createMailService,
  createMailTransporter,
  createPasswordResetMessage,
  createEmailVerificationMessage,
  createWelcomeMessage,
  isPasswordResetEmailConfigured,
  isTransactionalEmailConfigured,
  escapeHtml
};
