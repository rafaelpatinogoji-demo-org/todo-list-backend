const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const f_adminLogin = async (p_req, p_res) => {
  try {
    const { email, password } = p_req.body;

    const v_user = await User.findOne({ email, isActive: true });
    if (!v_user || !['admin', 'superadmin'].includes(v_user.role)) {
      return p_res.status(401).json({ message: 'Credenciales inválidas o acceso denegado' });
    }

    const v_isValidPassword = await bcrypt.compare(password, v_user.password);
    if (!v_isValidPassword) {
      return p_res.status(401).json({ message: 'Credenciales inválidas' });
    }

    v_user.lastLogin = new Date();
    await v_user.save();

    const v_token = jwt.sign(
      { userId: v_user._id, role: v_user.role },
      process.env.JWT_SECRET || 'mflix_secret_key',
      { expiresIn: '8h' }
    );

    p_res.json({
      token: v_token,
      user: {
        id: v_user._id,
        name: v_user.name,
        email: v_user.email,
        role: v_user.role
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_verifyAdminToken = async (p_req, p_res) => {
  try {
    p_res.json({
      user: {
        id: p_req.user._id,
        name: p_req.user.name,
        email: p_req.user.email,
        role: p_req.user.role
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_adminLogin,
  f_verifyAdminToken
};
