const Notification = require('../models/Notification');

const f_getAllNotifications = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_userId = p_req.query.user_id;
    const v_readStatus = p_req.query.read;

    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id query parameter is required' });
    }

    const v_filter = { user_id: v_userId };
    if (v_readStatus !== undefined) {
      v_filter.read = v_readStatus === 'true';
    }

    const v_notifications = await Notification.find(v_filter)
      .sort({ created_at: -1 })
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await Notification.countDocuments(v_filter);

    p_res.json({
      notifications: v_notifications,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalNotifications: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getNotificationById = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findById(p_req.params.id);
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    p_res.json(v_notification);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_markAsRead = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findByIdAndUpdate(
      p_req.params.id,
      { read: true },
      { new: true, runValidators: true }
    );
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    p_res.json(v_notification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_markAllAsRead = async (p_req, p_res) => {
  try {
    const v_userId = p_req.body.user_id;
    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id is required in request body' });
    }

    const v_result = await Notification.updateMany(
      { user_id: v_userId, read: false },
      { read: true }
    );

    p_res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: v_result.modifiedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_deleteNotification = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findByIdAndDelete(p_req.params.id);
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    p_res.json({ message: 'Notification deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUnreadCount = async (p_req, p_res) => {
  try {
    const v_userId = p_req.query.user_id;
    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id query parameter is required' });
    }

    const v_count = await Notification.countDocuments({ 
      user_id: v_userId, 
      read: false 
    });

    p_res.json({ unreadCount: v_count });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createNotification = async (p_req, p_res) => {
  try {
    const v_notification = new Notification(p_req.body);
    const v_savedNotification = await v_notification.save();
    p_res.status(201).json(v_savedNotification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllNotifications,
  f_getNotificationById,
  f_createNotification,
  f_markAsRead,
  f_markAllAsRead,
  f_deleteNotification,
  f_getUnreadCount
};
