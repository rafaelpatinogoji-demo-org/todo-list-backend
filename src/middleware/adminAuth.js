const User = require('../models/User');
const Session = require('../models/Session');
const jwt = require('jsonwebtoken');

const f_verifyAdminAuth = async (p_req, p_res, p_next) => {
  try {
    const v_token = p_req.header('Authorization')?.replace('Bearer ', '');
    
    if (!v_token) {
      return p_res.status(401).json({ message: 'Token de acceso requerido' });
    }

    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET || 'default_secret');
    
    const v_session = await Session.findOne({ jwt: v_token });
    if (!v_session) {
      return p_res.status(401).json({ message: 'Sesión inválida' });
    }

    const v_user = await User.findById(v_decoded.userId);
    if (!v_user || v_user.role !== 'admin' || v_user.status !== 'active') {
      return p_res.status(403).json({ message: 'Acceso denegado - Se requieren permisos de administrador' });
    }

    p_req.admin = v_user;
    p_next();
  } catch (p_error) {
    p_res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = { f_verifyAdminAuth };
