const jwt = require('jsonwebtoken');
const User = require('../models/User');

const f_verifyToken = async (p_req, p_res, p_next) => {
  try {
    const v_token = p_req.header('Authorization')?.replace('Bearer ', '');
    
    if (!v_token) {
      return p_res.status(401).json({ message: 'Token de acceso requerido' });
    }

    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET || 'mflix_secret_key');
    const v_user = await User.findById(v_decoded.userId);

    if (!v_user || !v_user.isActive) {
      return p_res.status(401).json({ message: 'Usuario no válido o inactivo' });
    }

    p_req.user = v_user;
    p_next();
  } catch (p_error) {
    p_res.status(401).json({ message: 'Token inválido' });
  }
};

const f_verifyAdmin = (p_req, p_res, p_next) => {
  if (!p_req.user || !['admin', 'superadmin'].includes(p_req.user.role)) {
    return p_res.status(403).json({ message: 'Acceso denegado: se requieren permisos de administrador' });
  }
  p_next();
};

const f_verifySuperAdmin = (p_req, p_res, p_next) => {
  if (!p_req.user || p_req.user.role !== 'superadmin') {
    return p_res.status(403).json({ message: 'Acceso denegado: se requieren permisos de superadministrador' });
  }
  p_next();
};

module.exports = {
  f_verifyToken,
  f_verifyAdmin,
  f_verifySuperAdmin
};
