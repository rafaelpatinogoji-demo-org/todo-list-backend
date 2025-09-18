const User = require('../models/User');
const bcrypt = require('bcryptjs');

const f_getAllUsers = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_users = await User.find()
      .select('-password -emailVerificationToken -passwordResetToken')
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await User.countDocuments();

    p_res.json({
      users: v_users,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalUsers: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserById = async (p_req, p_res) => {
  try {
    const v_user = await User.findById(p_req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken');
    if (!v_user) {
      return p_res.status(404).json({ message: 'User not found' });
    }
    p_res.json(v_user);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createUser = async (p_req, p_res) => {
  try {
    if (p_req.body.password) {
      const v_saltRounds = 12;
      p_req.body.password = await bcrypt.hash(p_req.body.password, v_saltRounds);
    }
    
    const v_user = new User(p_req.body);
    const v_savedUser = await v_user.save();
    
    const v_userResponse = v_savedUser.toObject();
    delete v_userResponse.password;
    delete v_userResponse.emailVerificationToken;
    delete v_userResponse.passwordResetToken;
    
    p_res.status(201).json(v_userResponse);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateUser = async (p_req, p_res) => {
  try {
    if (p_req.body.password) {
      const v_saltRounds = 12;
      p_req.body.password = await bcrypt.hash(p_req.body.password, v_saltRounds);
    }
    
    const v_user = await User.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken');
    
    if (!v_user) {
      return p_res.status(404).json({ message: 'User not found' });
    }
    p_res.json(v_user);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteUser = async (p_req, p_res) => {
  try {
    const v_user = await User.findByIdAndDelete(p_req.params.id);
    if (!v_user) {
      return p_res.status(404).json({ message: 'User not found' });
    }
    p_res.json({ message: 'User deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllUsers,
  f_getUserById,
  f_createUser,
  f_updateUser,
  f_deleteUser
};
