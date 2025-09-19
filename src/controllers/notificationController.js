const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const NotificationTemplate = require('../models/NotificationTemplate');
const { f_sendRealTimeNotification, f_sendEmailNotification, f_sendPushNotification } = require('../services/notificationService');
const mongoose = require('mongoose');

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
    if (p_req.query.read !== undefined) {
      v_filter.read = p_req.query.read === 'true';
    }
    if (p_req.query.type) {
      v_filter.type = p_req.query.type;
    }

    const v_notifications = await Notification.find(v_filter)
      .populate('user_id', 'name email')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_at: -1 });

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

const f_createNotification = async (p_req, p_res) => {
  try {
    const v_notification = new Notification(p_req.body);
    const v_savedNotification = await v_notification.save();
    
    await f_sendRealTimeNotification(v_savedNotification);
    
    const v_preferences = await NotificationPreference.findOne({ user_id: v_savedNotification.user_id });
    if (v_preferences && v_preferences.email_enabled) {
      await f_sendEmailNotification(v_savedNotification);
    }
    
    if (v_preferences && v_preferences.push_enabled) {
      await f_sendPushNotification(v_savedNotification);
    }

    const v_populatedNotification = await Notification.findById(v_savedNotification._id)
      .populate('user_id', 'name email');
    
    p_res.status(201).json(v_populatedNotification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_markAsRead = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findByIdAndUpdate(
      p_req.params.id,
      { read: true, read_at: new Date() },
      { new: true }
    ).populate('user_id', 'name email');
    
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
      return p_res.status(400).json({ message: 'user_id is required' });
    }

    await Notification.updateMany(
      { user_id: v_userId, read: false },
      { read: true, read_at: new Date() }
    );
    
    p_res.json({ message: 'All notifications marked as read' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getNotificationPreferences = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    let v_preferences = await NotificationPreference.findOne({ user_id: v_userId });
    
    if (!v_preferences) {
      v_preferences = new NotificationPreference({ user_id: v_userId });
      await v_preferences.save();
    }
    
    p_res.json(v_preferences);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_updateNotificationPreferences = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    const v_preferences = await NotificationPreference.findOneAndUpdate(
      { user_id: v_userId },
      p_req.body,
      { new: true, upsert: true }
    );
    
    p_res.json(v_preferences);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getNotificationStats = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    
    const v_stats = await Notification.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(v_userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
          byType: {
            $push: {
              type: '$type',
              read: '$read'
            }
          }
        }
      }
    ]);
    
    p_res.json(v_stats[0] || { total: 0, unread: 0, byType: [] });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getNotificationById = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findById(p_req.params.id)
      .populate('user_id', 'name email');
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    p_res.json(v_notification);
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

module.exports = {
  f_getAllNotifications,
  f_createNotification,
  f_markAsRead,
  f_markAllAsRead,
  f_getNotificationPreferences,
  f_updateNotificationPreferences,
  f_getNotificationStats,
  f_getNotificationById,
  f_deleteNotification
};
