const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const f_logAuditAction = async (p_adminId, p_action, p_targetType, p_targetId, p_details = {}) => {
  try {
    const v_auditLog = new AuditLog({
      admin_id: p_adminId,
      action: p_action,
      target_type: p_targetType,
      target_id: p_targetId,
      details: p_details
    });
    await v_auditLog.save();
  } catch (p_error) {
    console.error('Error logging audit action:', p_error);
  }
};

const f_getAllUsersAdmin = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    const { status, role, search } = p_req.query;

    const v_filter = {};
    if (status) v_filter.status = status;
    if (role) v_filter.role = role;
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

const f_suspendUser = async (p_req, p_res) => {
  try {
    const v_user = await User.findByIdAndUpdate(
      p_req.params.id,
      { status: 'suspended' },
      { new: true }
    ).select('-password');

    if (!v_user) {
      return p_res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      'suspend_user',
      'user',
      v_user._id.toString(),
      { reason: p_req.body.reason || 'No especificada' }
    );

    p_res.json({ message: 'Usuario suspendido exitosamente', user: v_user });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_activateUser = async (p_req, p_res) => {
  try {
    const v_user = await User.findByIdAndUpdate(
      p_req.params.id,
      { status: 'active' },
      { new: true }
    ).select('-password');

    if (!v_user) {
      return p_res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      'activate_user',
      'user',
      v_user._id.toString()
    );

    p_res.json({ message: 'Usuario activado exitosamente', user: v_user });
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

    await f_logAuditAction(
      p_req.admin._id,
      'delete_user',
      'user',
      v_user._id.toString(),
      { deletedUser: { name: v_user.name, email: v_user.email } }
    );

    p_res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_bulkUserOperation = async (p_req, p_res) => {
  try {
    const { userIds, operation } = p_req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return p_res.status(400).json({ message: 'IDs de usuarios requeridos' });
    }

    let v_result;
    switch (operation) {
      case 'suspend':
        v_result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'suspended' }
        );
        break;
      case 'activate':
        v_result = await User.updateMany(
          { _id: { $in: userIds } },
          { status: 'active' }
        );
        break;
      default:
        return p_res.status(400).json({ message: 'Operación no válida' });
    }

    await f_logAuditAction(
      p_req.admin._id,
      `bulk_${operation}_users`,
      'user',
      'multiple',
      { userIds, count: v_result.modifiedCount }
    );

    p_res.json({ 
      message: `Operación ${operation} aplicada a ${v_result.modifiedCount} usuarios`,
      modifiedCount: v_result.modifiedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllUsersAdmin,
  f_suspendUser,
  f_activateUser,
  f_deleteUserAdmin,
  f_bulkUserOperation
};
