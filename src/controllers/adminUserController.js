const bcrypt = require('bcrypt');
const User = require('../models/User');

const f_getAllUsersAdmin = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    const { role, isActive, search } = p_req.query;

    const v_filter = {};
    if (role) v_filter.role = role;
    if (isActive !== undefined) v_filter.isActive = isActive === 'true';
    if (search) {
      v_filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const v_users = await User.find(v_filter)
      .select('-password')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ createdAt: -1 });

    const v_total = await User.countDocuments(v_filter);

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

const f_createUserAdmin = async (p_req, p_res) => {
  try {
    const { password, ...v_userData } = p_req.body;
    
    const v_hashedPassword = await bcrypt.hash(password, 10);
    
    const v_user = new User({
      ...v_userData,
      password: v_hashedPassword
    });
    
    const v_savedUser = await v_user.save();
    const { password: _, ...v_userResponse } = v_savedUser.toObject();
    
    p_res.status(201).json(v_userResponse);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateUserAdmin = async (p_req, p_res) => {
  try {
    const { password, ...v_updateData } = p_req.body;
    
    if (password) {
      v_updateData.password = await bcrypt.hash(password, 10);
    }
    
    const v_user = await User.findByIdAndUpdate(
      p_req.params.id,
      v_updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!v_user) {
      return p_res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    p_res.json(v_user);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_toggleUserStatus = async (p_req, p_res) => {
  try {
    const v_user = await User.findById(p_req.params.id);
    if (!v_user) {
      return p_res.status(404).json({ message: 'Usuario no encontrado' });
    }

    v_user.isActive = !v_user.isActive;
    await v_user.save();

    const { password: _, ...v_userResponse } = v_user.toObject();
    p_res.json(v_userResponse);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_deleteUserAdmin = async (p_req, p_res) => {
  try {
    const v_user = await User.findByIdAndDelete(p_req.params.id);
    if (!v_user) {
      return p_res.status(404).json({ message: 'Usuario no encontrado' });
    }
    p_res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_bulkUserOperations = async (p_req, p_res) => {
  try {
    const { userIds, operation } = p_req.body;

    let v_result;
    switch (operation) {
      case 'activate':
        v_result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true }
        );
        break;
      case 'deactivate':
        v_result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: false }
        );
        break;
      case 'delete':
        v_result = await User.deleteMany({ _id: { $in: userIds } });
        break;
      default:
        return p_res.status(400).json({ message: 'Operación no válida' });
    }

    p_res.json({
      message: `Operación ${operation} completada`,
      modifiedCount: v_result.modifiedCount || v_result.deletedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportUsers = async (p_req, p_res) => {
  try {
    const v_users = await User.find().select('-password');
    
    p_res.setHeader('Content-Type', 'application/json');
    p_res.setHeader('Content-Disposition', 'attachment; filename=users_export.json');
    p_res.json(v_users);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllUsersAdmin,
  f_createUserAdmin,
  f_updateUserAdmin,
  f_toggleUserStatus,
  f_deleteUserAdmin,
  f_bulkUserOperations,
  f_exportUsers
};
