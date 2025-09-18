const nodemailer = require('nodemailer');

const f_createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Configuración de email no encontrada. Los emails no se enviarán.');
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const f_sendVerificationEmail = async (p_email, p_name, p_token) => {
  try {
    const v_transporter = f_createTransporter();
    
    if (!v_transporter) {
      console.log('Email de verificación no enviado - configuración faltante');
      return { success: false, message: 'Configuración de email no disponible' };
    }

    const v_verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${p_token}`;
    
    const v_mailOptions = {
      from: `"MFlix" <${process.env.SMTP_USER}>`,
      to: p_email,
      subject: 'Verifica tu cuenta de MFlix',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Bienvenido a MFlix, ${p_name}!</h2>
          <p>Gracias por registrarte. Para completar tu registro, por favor verifica tu dirección de email haciendo clic en el siguiente enlace:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${v_verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verificar Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
            <a href="${v_verificationUrl}">${v_verificationUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Este enlace expirará en 24 horas por seguridad.
          </p>
        </div>
      `
    };

    await v_transporter.sendMail(v_mailOptions);
    return { success: true, message: 'Email de verificación enviado' };
    
  } catch (p_error) {
    console.error('Error enviando email de verificación:', p_error);
    return { success: false, message: 'Error enviando email' };
  }
};

const f_sendPasswordResetEmail = async (p_email, p_name, p_token) => {
  try {
    const v_transporter = f_createTransporter();
    
    if (!v_transporter) {
      console.log('Email de reset no enviado - configuración faltante');
      return { success: false, message: 'Configuración de email no disponible' };
    }

    const v_resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${p_token}`;
    
    const v_mailOptions = {
      from: `"MFlix" <${process.env.SMTP_USER}>`,
      to: p_email,
      subject: 'Restablecer contraseña - MFlix',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Restablecer contraseña</h2>
          <p>Hola ${p_name},</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de MFlix. Si no solicitaste esto, puedes ignorar este email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${v_resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
            <a href="${v_resetUrl}">${v_resetUrl}</a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Este enlace expirará en 1 hora por seguridad.
          </p>
        </div>
      `
    };

    await v_transporter.sendMail(v_mailOptions);
    return { success: true, message: 'Email de reset enviado' };
    
  } catch (p_error) {
    console.error('Error enviando email de reset:', p_error);
    return { success: false, message: 'Error enviando email' };
  }
};

module.exports = {
  f_sendVerificationEmail,
  f_sendPasswordResetEmail
};
