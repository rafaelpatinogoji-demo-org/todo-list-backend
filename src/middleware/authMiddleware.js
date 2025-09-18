const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const f_authenticateToken = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers['authorization'];
    const v_token = v_authHeader && v_authHeader.split(' ')[1];

    if (!v_token) {
      return p_res.status(401).json({ message: 'Access token required' });
    }

    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET || 'default_secret');
    const v_session = await Session.findOne({ 
      user_id: v_decoded.userId, 
      jwt: v_token, 
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!v_session) {
      return p_res.status(401).json({ message: 'Invalid or expired token' });
    }

    const v_user = await User.findById(v_decoded.userId);
    if (!v_user) {
      return p_res.status(401).json({ message: 'User not found' });
    }

    p_req.user = v_user;
    p_req.session = v_session;
    p_next();
  } catch (p_error) {
    return p_res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = { f_authenticateToken };
