const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const NotificationTemplate = require('../models/NotificationTemplate');

const f_getAllNotifications = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_userId = p_req.query.user_id;

    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id is required' });
    }

    const v_filter = { user_id: v_userId };
    if (p_req.query.status) {
      v_filter.status = p_req.query.status;
    }
    if (p_req.query.type) {
      v_filter.type = p_req.query.type;
    }

    const v_notifications = await Notification.find(v_filter)
      .populate('user_id', 'name email')
      .populate('template_id', 'name')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ createdAt: -1 });

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
    const v_notification = await Notification.findById(p_req.params.id)
      .populate('user_id', 'name email')
      .populate('template_id', 'name body_template');
    
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    
    p_res.json(v_notification);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createNotification = async (p_req, p_res) => {
  try {
    const v_notification = new Notification(p_req.body);
    const v_savedNotification = await v_notification.save();
    const v_populatedNotification = await Notification.findById(v_savedNotification._id)
      .populate('user_id', 'name email')
      .populate('template_id', 'name');
    
    p_res.status(201).json(v_populatedNotification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_markAsRead = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findByIdAndUpdate(
      p_req.params.id,
      { 
        status: 'read',
        read_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email');
    
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    
    p_res.json(v_notification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_markMultipleAsRead = async (p_req, p_res) => {
  try {
    const { notification_ids } = p_req.body;
    
    if (!notification_ids || !Array.isArray(notification_ids)) {
      return p_res.status(400).json({ message: 'notification_ids array is required' });
    }

    const v_result = await Notification.updateMany(
      { _id: { $in: notification_ids } },
      { 
        status: 'read',
        read_at: new Date()
      }
    );

    p_res.json({ 
      message: 'Notifications marked as read',
      modifiedCount: v_result.modifiedCount
    });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getNotificationStats = async (p_req, p_res) => {
  try {
    const v_userId = p_req.query.user_id;
    
    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id is required' });
    }

    const mongoose = require('mongoose');
    const v_stats = await Notification.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(v_userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const v_formattedStats = {
      total: 0,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      read: 0
    };

    v_stats.forEach(stat => {
      v_formattedStats[stat._id] = stat.count;
      v_formattedStats.total += stat.count;
    });

    p_res.json(v_formattedStats);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllNotifications,
  f_getNotificationById,
  f_createNotification,
  f_markAsRead,
  f_markMultipleAsRead,
  f_getNotificationStats
};
