const Session = require('../models/Session');
const User = require('../models/User');

const f_authenticateUser = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers.authorization;
    if (!v_authHeader) {
      return p_res.status(401).json({ message: 'No authorization header' });
    }
    
    const v_token = v_authHeader.split(' ')[1];
    if (!v_token) {
      return p_res.status(401).json({ message: 'No token provided' });
    }
    
    const v_session = await Session.findOne({ jwt: v_token });
    if (!v_session) {
      return p_res.status(401).json({ message: 'Invalid session' });
    }
    
    const v_user = await User.findById(v_session.user_id);
    if (!v_user) {
      return p_res.status(401).json({ message: 'User not found' });
    }
    
    p_req.user = v_user;
    p_next();
  } catch (p_error) {
    p_res.status(401).json({ message: 'Authentication failed' });
  }
};

const f_optionalAuth = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers.authorization;
    if (v_authHeader) {
      const v_token = v_authHeader.split(' ')[1];
      if (v_token) {
        const v_session = await Session.findOne({ jwt: v_token });
        if (v_session) {
          const v_user = await User.findById(v_session.user_id);
          if (v_user) {
            p_req.user = v_user;
          }
        }
      }
    }
    p_next();
  } catch (p_error) {
    p_next();
  }
};

module.exports = { f_authenticateUser, f_optionalAuth };
