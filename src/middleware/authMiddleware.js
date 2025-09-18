const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const f_verifyToken = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers.authorization;
    
    if (!v_authHeader || !v_authHeader.startsWith('Bearer ')) {
      return p_res.status(401).json({ 
        message: 'Token de acceso requerido' 
      });
    }

    const v_token = v_authHeader.substring(7);
    
    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET);
    
    const v_session = await Session.findOne({ 
      user_id: v_decoded.userId,
      jwt: v_token 
    });
    
    if (!v_session) {
      return p_res.status(401).json({ 
        message: 'Sesión inválida o expirada' 
      });
    }

    const v_user = await User.findById(v_decoded.userId);
    if (!v_user) {
      return p_res.status(401).json({ 
        message: 'Usuario no encontrado' 
      });
    }

    v_session.lastAccessed = new Date();
    await v_session.save();

    p_req.user = v_user;
    p_req.session = v_session;
    
    p_next();
  } catch (p_error) {
    if (p_error.name === 'JsonWebTokenError') {
      return p_res.status(401).json({ 
        message: 'Token inválido' 
      });
    }
    if (p_error.name === 'TokenExpiredError') {
      return p_res.status(401).json({ 
        message: 'Token expirado' 
      });
    }
    
    console.error('Error en middleware de autenticación:', p_error);
    p_res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
};

const f_optionalAuth = async (p_req, p_res, p_next) => {
  try {
    const v_authHeader = p_req.headers.authorization;
    
    if (!v_authHeader || !v_authHeader.startsWith('Bearer ')) {
      return p_next();
    }

    const v_token = v_authHeader.substring(7);
    const v_decoded = jwt.verify(v_token, process.env.JWT_SECRET);
    
    const v_session = await Session.findOne({ 
      user_id: v_decoded.userId,
      jwt: v_token 
    });
    
    if (v_session) {
      const v_user = await User.findById(v_decoded.userId);
      if (v_user) {
        v_session.lastAccessed = new Date();
        await v_session.save();
        
        p_req.user = v_user;
        p_req.session = v_session;
      }
    }
    
    p_next();
  } catch (p_error) {
    p_next();
  }
};

module.exports = {
  f_verifyToken,
  f_optionalAuth
};
