const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const f_authenticateToken = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers['authorization'];
    const v_token = v_authHeader && v_authHeader.split(' ')[1];

    if (!v_token) {
      return p_res.status(401).json({ message: 'Token de acceso requerido' });
    }

    // Verificar JWT
    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET);
    
    // Verificar que la sesión existe y es válida
    const v_session = await Session.findOne({ 
      user_id: v_decoded.userId, 
      jwt: v_token,
      expiresAt: { $gt: new Date() }
    });

    if (!v_session) {
      return p_res.status(401).json({ message: 'Sesión inválida o expirada' });
    }

    // Obtener usuario
    const v_user = await User.findById(v_decoded.userId);
    if (!v_user) {
      return p_res.status(401).json({ message: 'Usuario no encontrado' });
    }

    p_req.user = v_user;
    p_req.session = v_session;
    p_next();
  } catch (p_error) {
    if (p_error.name === 'JsonWebTokenError') {
      return p_res.status(401).json({ message: 'Token inválido' });
    }
    if (p_error.name === 'TokenExpiredError') {
      return p_res.status(401).json({ message: 'Token expirado' });
    }
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_authenticateToken
};
