const Notification = require('../models/Notification');

const f_getAllNotifications = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_notifications = await Notification.find()
      .populate('user_id', 'name email')
      .populate('event_id', 'title start_date')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ created_date: -1 });

    const v_total = await Notification.countDocuments();

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
      .populate('event_id', 'title start_date event_type');
    
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
    p_res.status(201).json(v_savedNotification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_sendNotification = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findById(p_req.params.id);
    
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    
    if (v_notification.status === 'sent') {
      return p_res.status(400).json({ message: 'Notification already sent' });
    }
    
    v_notification.status = 'sent';
    v_notification.sent_date = new Date();
    await v_notification.save();
    
    p_res.json({ 
      message: 'Notification sent successfully', 
      notification: v_notification 
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getNotificationsByUser = async (p_req, p_res) => {
  try {
    const v_notifications = await Notification.find({ user_id: p_req.params.userId })
      .populate('event_id', 'title start_date event_type')
      .sort({ created_date: -1 });
    
    p_res.json(v_notifications);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_markAsRead = async (p_req, p_res) => {
  try {
    const v_notification = await Notification.findByIdAndUpdate(
      p_req.params.id,
      { status: 'sent' },
      { new: true }
    );
    
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    
    p_res.json({ 
      message: 'Notification marked as read', 
      notification: v_notification 
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_scheduleReminder = async (p_req, p_res) => {
  try {
    const { user_id, event_id, hours_before } = p_req.body;
    
    if (!user_id || !event_id || !hours_before) {
      return p_res.status(400).json({ 
        message: 'User ID, event ID, and hours_before are required' 
      });
    }
    
    const Event = require('../models/Event');
    const v_event = await Event.findById(event_id);
    
    if (!v_event) {
      return p_res.status(404).json({ message: 'Event not found' });
    }
    
    const v_reminderDate = new Date(v_event.start_date);
    v_reminderDate.setHours(v_reminderDate.getHours() - hours_before);
    
    const v_notification = new Notification({
      user_id,
      event_id,
      notification_type: 'reminder',
      title: `Recordatorio: ${v_event.title}`,
      message: `Tu evento "${v_event.title}" comenzará en ${hours_before} horas.`,
      scheduled_date: v_reminderDate,
      delivery_method: 'email'
    });
    
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
  f_sendNotification,
  f_getNotificationsByUser,
  f_markAsRead,
  f_scheduleReminder
};
