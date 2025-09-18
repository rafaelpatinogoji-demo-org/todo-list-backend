const Session = require('../models/Session');

const f_authenticateUser = async (p_req, p_res, p_next) => {
  try {
    const v_token = p_req.headers.authorization?.replace('Bearer ', '');
    
    if (!v_token) {
      return p_res.status(401).json({ message: 'Token de autenticación requerido' });
    }

    const v_session = await Session.findOne({ jwt: v_token });
    
    if (!v_session) {
      return p_res.status(401).json({ message: 'Sesión inválida' });
    }

    p_req.user_id = v_session.user_id;
    p_next();
  } catch (p_error) {
    p_res.status(500).json({ message: 'Error de autenticación', error: p_error.message });
  }
};

module.exports = { f_authenticateUser };
