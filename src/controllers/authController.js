const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Session = require('../models/Session');

// Configuración de email (usar variables de entorno en producción)
const v_emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generar JWT
const f_generateTokens = (p_userId) => {
  const v_accessToken = jwt.sign(
    { userId: p_userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  
  const v_refreshToken = jwt.sign(
    { userId: p_userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { v_accessToken, v_refreshToken };
};

// Registro de usuario
const f_register = async (p_req, p_res) => {
  try {
    const { name, email, password } = p_req.body;

    // Verificar si el usuario ya existe
    const v_existingUser = await User.findOne({ email });
    if (v_existingUser) {
      return p_res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Generar token de verificación de email
    const v_emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Crear usuario
    const v_user = new User({
      name,
      email,
      password,
      emailVerificationToken: v_emailVerificationToken
    });

    await v_user.save();

    // Enviar email de verificación (mock en desarrollo)
    if (process.env.NODE_ENV !== 'development') {
      const v_verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${v_emailVerificationToken}`;
      
      await v_emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verificación de email - MFlix',
        html: `<p>Haz clic <a href="${v_verificationUrl}">aquí</a> para verificar tu email.</p>`
      });
    }

    p_res.status(201).json({
      message: 'Usuario registrado exitosamente. Verifica tu email.',
      userId: v_user._id
    });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

// Login de usuario
const f_login = async (p_req, p_res) => {
  try {
    const { email, password } = p_req.body;

    // Buscar usuario
    const v_user = await User.findOne({ email });
    if (!v_user) {
      return p_res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const v_isPasswordValid = await v_user.f_comparePassword(password);
    if (!v_isPasswordValid) {
      return p_res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generar tokens
    const { v_accessToken, v_refreshToken } = f_generateTokens(v_user._id);

    // Crear sesión
    const v_expiresAt = new Date();
    v_expiresAt.setDate(v_expiresAt.getDate() + 7);

    const v_session = new Session({
      user_id: v_user._id,
      jwt: v_accessToken,
      refreshToken: v_refreshToken,
      expiresAt: v_expiresAt
    });

    await v_session.save();

    p_res.json({
      message: 'Login exitoso',
      accessToken: v_accessToken,
      refreshToken: v_refreshToken,
      user: {
        id: v_user._id,
        name: v_user.name,
        email: v_user.email,
        isEmailVerified: v_user.isEmailVerified
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

// Logout
const f_logout = async (p_req, p_res) => {
  try {
    // Eliminar sesión actual
    await Session.findByIdAndDelete(p_req.session._id);
    
    p_res.json({ message: 'Logout exitoso' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

// Refresh token
const f_refreshToken = async (p_req, p_res) => {
  try {
    const { refreshToken } = p_req.body;

    if (!refreshToken) {
      return p_res.status(401).json({ message: 'Refresh token requerido' });
    }

    // Verificar refresh token
    const v_decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Buscar sesión
    const v_session = await Session.findOne({ 
      user_id: v_decoded.userId, 
      refreshToken: refreshToken,
      expiresAt: { $gt: new Date() }
    });

    if (!v_session) {
      return p_res.status(401).json({ message: 'Refresh token inválido' });
    }

    // Generar nuevos tokens
    const { v_accessToken, v_refreshToken } = f_generateTokens(v_decoded.userId);

    // Actualizar sesión
    v_session.jwt = v_accessToken;
    v_session.refreshToken = v_refreshToken;
    await v_session.save();

    p_res.json({
      accessToken: v_accessToken,
      refreshToken: v_refreshToken
    });
  } catch (p_error) {
    if (p_error.name === 'JsonWebTokenError' || p_error.name === 'TokenExpiredError') {
      return p_res.status(401).json({ message: 'Refresh token inválido' });
    }
    p_res.status(500).json({ message: p_error.message });
  }
};

// Verificación de email
const f_verifyEmail = async (p_req, p_res) => {
  try {
    const { token } = p_req.body;

    const v_user = await User.findOne({ emailVerificationToken: token });
    if (!v_user) {
      return p_res.status(400).json({ message: 'Token de verificación inválido' });
    }

    v_user.isEmailVerified = true;
    v_user.emailVerificationToken = undefined;
    await v_user.save();

    p_res.json({ message: 'Email verificado exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

// Solicitar reset de contraseña
const f_requestPasswordReset = async (p_req, p_res) => {
  try {
    const { email } = p_req.body;

    const v_user = await User.findOne({ email });
    if (!v_user) {
      // Por seguridad, no revelar si el email existe
      return p_res.json({ message: 'Si el email existe, recibirás instrucciones de reset' });
    }

    // Generar token de reset
    const v_resetToken = crypto.randomBytes(32).toString('hex');
    const v_resetExpires = new Date();
    v_resetExpires.setHours(v_resetExpires.getHours() + 1);

    v_user.passwordResetToken = v_resetToken;
    v_user.passwordResetExpires = v_resetExpires;
    await v_user.save();

    // Enviar email de reset (mock en desarrollo)
    if (process.env.NODE_ENV !== 'development') {
      const v_resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${v_resetToken}`;
      
      await v_emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Reset de contraseña - MFlix',
        html: `<p>Haz clic <a href="${v_resetUrl}">aquí</a> para resetear tu contraseña.</p>`
      });
    }

    p_res.json({ message: 'Si el email existe, recibirás instrucciones de reset' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

// Reset de contraseña
const f_resetPassword = async (p_req, p_res) => {
  try {
    const { token, newPassword } = p_req.body;

    const v_user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!v_user) {
      return p_res.status(400).json({ message: 'Token de reset inválido o expirado' });
    }

    v_user.password = newPassword;
    v_user.passwordResetToken = undefined;
    v_user.passwordResetExpires = undefined;
    await v_user.save();

    // Invalidar todas las sesiones del usuario
    await Session.deleteMany({ user_id: v_user._id });

    p_res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_register,
  f_login,
  f_logout,
  f_refreshToken,
  f_verifyEmail,
  f_requestPasswordReset,
  f_resetPassword
};
