const EventNotification = require('../models/EventNotification');

const f_scheduleNotification = async (p_req, p_res) => {
  try {
    const v_notification = new EventNotification(p_req.body);
    const v_savedNotification = await v_notification.save();
    const v_populatedNotification = await EventNotification.findById(v_savedNotification._id)
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email');
    
    p_res.status(201).json(v_populatedNotification);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_sendNotifications = async (p_req, p_res) => {
  try {
    const v_currentDate = new Date();
    const v_pendingNotifications = await EventNotification.find({
      status: 'pending',
      scheduled_date: { $lte: v_currentDate }
    })
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email');
    
    const v_results = [];
    
    for (const v_notification of v_pendingNotifications) {
      try {
        v_notification.status = 'sent';
        v_notification.sent_date = new Date();
        await v_notification.save();
        
        v_results.push({
          notification_id: v_notification._id,
          status: 'sent',
          user: v_notification.user_id.email,
          message: v_notification.message
        });
      } catch (p_error) {
        v_notification.status = 'failed';
        await v_notification.save();
        
        v_results.push({
          notification_id: v_notification._id,
          status: 'failed',
          user: v_notification.user_id.email,
          error: p_error.message
        });
      }
    }
    
    p_res.json({
      message: `Processed ${v_results.length} notifications`,
      results: v_results
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserNotifications = async (p_req, p_res) => {
  try {
    const v_notifications = await EventNotification.find({ user_id: p_req.params.userId })
      .populate('event_id', 'title start_date event_type')
      .sort({ scheduled_date: -1 });
    
    p_res.json(v_notifications);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_markNotificationSent = async (p_req, p_res) => {
  try {
    const v_notification = await EventNotification.findByIdAndUpdate(
      p_req.params.id,
      { 
        status: 'sent',
        sent_date: new Date()
      },
      { new: true }
    )
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email');
    
    if (!v_notification) {
      return p_res.status(404).json({ message: 'Notification not found' });
    }
    
    p_res.json(v_notification);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getAllNotifications = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_notifications = await EventNotification.find()
      .populate('event_id', 'title start_date event_type')
      .populate('user_id', 'name email')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ scheduled_date: -1 });

    const v_total = await EventNotification.countDocuments();

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

const f_getEventNotifications = async (p_req, p_res) => {
  try {
    const v_notifications = await EventNotification.find({ event_id: p_req.params.eventId })
      .populate('user_id', 'name email')
      .sort({ scheduled_date: -1 });
    
    p_res.json(v_notifications);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_scheduleNotification,
  f_sendNotifications,
  f_getUserNotifications,
  f_markNotificationSent,
  f_getAllNotifications,
  f_getEventNotifications
};
