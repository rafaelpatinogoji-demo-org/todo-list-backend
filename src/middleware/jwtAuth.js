const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const f_jwtAuth = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers.authorization;
    if (!v_authHeader || !v_authHeader.startsWith('Bearer ')) {
      return p_res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const v_token = v_authHeader.substring(7);

    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET || 'fallback-secret');

    const v_session = await Session.findOne({ jwt: v_token });
    if (!v_session) {
      return p_res.status(401).json({ message: 'Invalid token. Session not found.' });
    }

    p_req.user = { user_id: v_session.user_id };
    p_next();
  } catch (p_error) {
    if (p_error.name === 'JsonWebTokenError') {
      return p_res.status(401).json({ message: 'Invalid token.' });
    }
    if (p_error.name === 'TokenExpiredError') {
      return p_res.status(401).json({ message: 'Token expired.' });
    }
    return p_res.status(401).json({ message: 'Token verification failed.' });
  }
};

module.exports = f_jwtAuth;
