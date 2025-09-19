const cron = require('node-cron');
const Notification = require('../models/Notification');
const { f_sendRealTimeNotification, f_sendEmailNotification, f_sendPushNotification } = require('./notificationService');

const f_startScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const v_now = new Date();
      const v_pendingNotifications = await Notification.find({
        scheduled_for: { $lte: v_now },
        'delivery_status.realtime': false
      }).populate('user_id');

      for (const v_notification of v_pendingNotifications) {
        const v_preferences = await require('../models/NotificationPreference')
          .findOne({ user_id: v_notification.user_id._id });
        
        if (f_isQuietHours(v_preferences)) {
          continue;
        }

        if (v_notification.priority === 'urgent') {
          await f_sendAllChannels(v_notification, v_preferences);
        } else {
          await f_sendBasedOnPreferences(v_notification, v_preferences);
        }
      }
    } catch (p_error) {
      console.error('Error in notification scheduler:', p_error);
    }
  });

  console.log('Notification scheduler started');
};

const f_isQuietHours = (p_preferences) => {
  if (!p_preferences || !p_preferences.quiet_hours.enabled) {
    return false;
  }

  const v_now = new Date();
  const v_currentTime = v_now.getHours() * 100 + v_now.getMinutes();
  const v_startTime = parseInt(p_preferences.quiet_hours.start_time.replace(':', ''));
  const v_endTime = parseInt(p_preferences.quiet_hours.end_time.replace(':', ''));

  if (v_startTime > v_endTime) {
    return v_currentTime >= v_startTime || v_currentTime <= v_endTime;
  } else {
    return v_currentTime >= v_startTime && v_currentTime <= v_endTime;
  }
};

const f_sendAllChannels = async (p_notification, p_preferences) => {
  await f_sendRealTimeNotification(p_notification);
  if (p_preferences && p_preferences.email_enabled) {
    await f_sendEmailNotification(p_notification);
  }
  if (p_preferences && p_preferences.push_enabled) {
    await f_sendPushNotification(p_notification);
  }
};

const f_sendBasedOnPreferences = async (p_notification, p_preferences) => {
  if (!p_preferences) {
    await f_sendRealTimeNotification(p_notification);
    return;
  }

  if (p_preferences.realtime_enabled) {
    await f_sendRealTimeNotification(p_notification);
  }
  if (p_preferences.email_enabled) {
    await f_sendEmailNotification(p_notification);
  }
  if (p_preferences.push_enabled) {
    await f_sendPushNotification(p_notification);
  }
};

module.exports = { f_startScheduler };
