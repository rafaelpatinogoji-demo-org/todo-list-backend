const Session = require('../models/Session');

const f_extractUserFromToken = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers.authorization;
    
    if (v_authHeader && v_authHeader.startsWith('Bearer ')) {
      const v_token = v_authHeader.substring(7);
      
      const v_session = await Session.findOne({ jwt: v_token });
      
      if (v_session) {
        p_req.user_id = v_session.user_id;
      }
    }
    
    p_next();
  } catch (p_error) {
    p_next();
  }
};

const f_requireAuth = async (p_req, p_res, p_next) => {
  if (!p_req.user_id) {
    return p_res.status(401).json({ message: 'Autenticación requerida' });
  }
  p_next();
};

module.exports = { f_extractUserFromToken, f_requireAuth };
