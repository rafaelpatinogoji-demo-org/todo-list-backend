const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const { f_sendVerificationEmail, f_sendPasswordResetEmail } = require('../utils/emailService');

const c_SALT_ROUNDS = 12;
const c_JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const c_REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

const f_generateTokens = (p_userId) => {
  const v_accessToken = jwt.sign(
    { userId: p_userId },
    process.env.JWT_SECRET,
    { expiresIn: c_JWT_EXPIRES_IN }
  );
  
  const v_refreshToken = jwt.sign(
    { userId: p_userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: c_REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { v_accessToken, v_refreshToken };
};

const f_getRefreshTokenExpiry = () => {
  const v_expiryDays = parseInt(c_REFRESH_TOKEN_EXPIRES_IN.replace('d', '')) || 7;
  return new Date(Date.now() + v_expiryDays * 24 * 60 * 60 * 1000);
};

const f_register = async (p_req, p_res) => {
  try {
    const { name, email, password } = p_req.body;

    if (!name || !email || !password) {
      return p_res.status(400).json({
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return p_res.status(400).json({
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const v_existingUser = await User.findOne({ email: email.toLowerCase() });
    if (v_existingUser) {
      return p_res.status(400).json({
        message: 'El email ya está registrado'
      });
    }

    const v_hashedPassword = await bcrypt.hash(password, c_SALT_ROUNDS);

    const v_emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const v_emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    const v_user = new User({
      name,
      email: email.toLowerCase(),
      password: v_hashedPassword,
      emailVerificationToken: v_emailVerificationToken,
      emailVerificationExpires: v_emailVerificationExpires
    });

    const v_savedUser = await v_user.save();

    const v_emailResult = await f_sendVerificationEmail(
      v_savedUser.email,
      v_savedUser.name,
      v_emailVerificationToken
    );

    const { password: _, emailVerificationToken: __, ...v_userResponse } = v_savedUser.toObject();

    p_res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: v_userResponse,
      emailSent: v_emailResult.success
    });

  } catch (p_error) {
    console.error('Error en registro:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const f_login = async (p_req, p_res) => {
  try {
    const { email, password } = p_req.body;

    if (!email || !password) {
      return p_res.status(400).json({
        message: 'Email y contraseña son requeridos'
      });
    }

    const v_user = await User.findOne({ email: email.toLowerCase() });
    if (!v_user) {
      return p_res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    const v_isPasswordValid = await bcrypt.compare(password, v_user.password);
    if (!v_isPasswordValid) {
      return p_res.status(401).json({
        message: 'Credenciales inválidas'
      });
    }

    const { v_accessToken, v_refreshToken } = f_generateTokens(v_user._id);

    const v_session = new Session({
      user_id: v_user._id,
      jwt: v_accessToken,
      refreshToken: v_refreshToken,
      refreshTokenExpires: f_getRefreshTokenExpiry(),
      userAgent: p_req.headers['user-agent'] || null,
      ipAddress: p_req.ip || p_req.connection.remoteAddress || null
    });

    await v_session.save();

    const { password: _, ...v_userResponse } = v_user.toObject();

    p_res.json({
      message: 'Login exitoso',
      user: v_userResponse,
      accessToken: v_accessToken,
      refreshToken: v_refreshToken,
      expiresIn: c_JWT_EXPIRES_IN
    });

  } catch (p_error) {
    console.error('Error en login:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const f_logout = async (p_req, p_res) => {
  try {
    const v_session = p_req.session;

    if (v_session) {
      await Session.findByIdAndDelete(v_session._id);
    }

    p_res.json({
      message: 'Logout exitoso'
    });

  } catch (p_error) {
    console.error('Error en logout:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const f_refreshToken = async (p_req, p_res) => {
  try {
    const { refreshToken } = p_req.body;

    if (!refreshToken) {
      return p_res.status(400).json({
        message: 'Refresh token requerido'
      });
    }

    const v_decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (v_decoded.type !== 'refresh') {
      return p_res.status(401).json({
        message: 'Token inválido'
      });
    }

    const v_session = await Session.findOne({
      user_id: v_decoded.userId,
      refreshToken: refreshToken,
      refreshTokenExpires: { $gt: new Date() }
    });

    if (!v_session) {
      return p_res.status(401).json({
        message: 'Refresh token inválido o expirado'
      });
    }

    const { v_accessToken, v_refreshToken: v_newRefreshToken } = f_generateTokens(v_decoded.userId);

    v_session.jwt = v_accessToken;
    v_session.refreshToken = v_newRefreshToken;
    v_session.refreshTokenExpires = f_getRefreshTokenExpiry();
    v_session.lastAccessed = new Date();
    
    await v_session.save();

    p_res.json({
      message: 'Token renovado exitosamente',
      accessToken: v_accessToken,
      refreshToken: v_newRefreshToken,
      expiresIn: c_JWT_EXPIRES_IN
    });

  } catch (p_error) {
    if (p_error.name === 'JsonWebTokenError' || p_error.name === 'TokenExpiredError') {
      return p_res.status(401).json({
        message: 'Refresh token inválido'
      });
    }
    
    console.error('Error renovando token:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const f_verifyEmail = async (p_req, p_res) => {
  try {
    const { token } = p_req.params;

    if (!token) {
      return p_res.status(400).json({
        message: 'Token de verificación requerido'
      });
    }

    const v_user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!v_user) {
      return p_res.status(400).json({
        message: 'Token de verificación inválido o expirado'
      });
    }

    v_user.isEmailVerified = true;
    v_user.emailVerificationToken = null;
    v_user.emailVerificationExpires = null;
    
    await v_user.save();

    p_res.json({
      message: 'Email verificado exitosamente'
    });

  } catch (p_error) {
    console.error('Error verificando email:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const f_forgotPassword = async (p_req, p_res) => {
  try {
    const { email } = p_req.body;

    if (!email) {
      return p_res.status(400).json({
        message: 'Email es requerido'
      });
    }

    const v_user = await User.findOne({ email: email.toLowerCase() });
    
    if (!v_user) {
      return p_res.json({
        message: 'Si el email existe, se enviará un enlace de reset'
      });
    }

    const v_resetToken = crypto.randomBytes(32).toString('hex');
    const v_resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    v_user.passwordResetToken = v_resetToken;
    v_user.passwordResetExpires = v_resetExpires;
    
    await v_user.save();

    await f_sendPasswordResetEmail(v_user.email, v_user.name, v_resetToken);

    p_res.json({
      message: 'Si el email existe, se enviará un enlace de reset'
    });

  } catch (p_error) {
    console.error('Error en forgot password:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const f_resetPassword = async (p_req, p_res) => {
  try {
    const { token, password } = p_req.body;

    if (!token || !password) {
      return p_res.status(400).json({
        message: 'Token y nueva contraseña son requeridos'
      });
    }

    if (password.length < 6) {
      return p_res.status(400).json({
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const v_user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!v_user) {
      return p_res.status(400).json({
        message: 'Token de reset inválido o expirado'
      });
    }

    const v_hashedPassword = await bcrypt.hash(password, c_SALT_ROUNDS);

    v_user.password = v_hashedPassword;
    v_user.passwordResetToken = null;
    v_user.passwordResetExpires = null;
    
    await v_user.save();

    await Session.deleteMany({ user_id: v_user._id });

    p_res.json({
      message: 'Contraseña restablecida exitosamente'
    });

  } catch (p_error) {
    console.error('Error restableciendo contraseña:', p_error);
    p_res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  f_register,
  f_login,
  f_logout,
  f_refreshToken,
  f_verifyEmail,
  f_forgotPassword,
  f_resetPassword
};
