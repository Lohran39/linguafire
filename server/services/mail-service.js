const nodemailer = require('nodemailer');

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
    auth: env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS
        }
      : undefined
  });
}

function createMailService(env = process.env) {
  async function sendPasswordResetEmail(to, resetUrl, name = '') {
    const transporter = createMailTransporter(env);
    if (!transporter) {
      throw new Error('SMTP não configurado.');
    }

    const from = env.SMTP_FROM || env.SMTP_USER;
    if (!from) {
      throw new Error('SMTP_FROM ou SMTP_USER precisa estar configurado.');
    }

    const safeName = String(name || 'aluno').trim();
    const safeHtmlName = escapeHtml(safeName);

    await transporter.sendMail({
      from,
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
    });
  }

  return { sendPasswordResetEmail };
}

module.exports = {
  createMailService,
  createMailTransporter,
  escapeHtml
};
