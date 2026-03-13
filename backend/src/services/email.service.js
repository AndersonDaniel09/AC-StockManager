const nodemailer = require('nodemailer');

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmployeeSetupEmail({ to, employeeName, setupUrl }) {
  const transporter = buildTransporter();

  const subject = 'Activa tu cuenta de AC StockManager';
  const text = [
    `Hola ${employeeName},`,
    '',
    'El administrador creó tu cuenta en AC StockManager.',
    'Haz clic en este enlace para crear tu contraseña y activar tu acceso:',
    setupUrl,
    '',
    'Si no solicitaste esta cuenta, ignora este mensaje.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>Activa tu cuenta</h2>
      <p>Hola <strong>${employeeName}</strong>,</p>
      <p>El administrador creó tu cuenta en <strong>AC StockManager</strong>.</p>
      <p>Haz clic en el siguiente botón para crear tu contraseña:</p>
      <p>
        <a href="${setupUrl}" style="display:inline-block;padding:10px 18px;background:#0284c7;color:white;text-decoration:none;border-radius:8px;font-weight:700;">
          Crear contraseña
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;">Si no solicitaste esta cuenta, ignora este mensaje.</p>
    </div>
  `;

  if (!transporter) {
    console.warn('SMTP no configurado. Enlace de activación:', setupUrl);
    return { sent: false, setupUrl };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}

module.exports = { sendEmployeeSetupEmail };
