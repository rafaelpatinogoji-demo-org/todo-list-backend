const cron = require('node-cron');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const NotificationPreferences = require('../models/NotificationPreferences');
const NotificationTemplate = require('../models/NotificationTemplate');
const User = require('../models/User');
const { f_sendEmailNotification } = require('./emailService');
const { f_sendPushNotification } = require('./pushNotificationService');
const { f_sendRealTimeNotification } = require('./websocketService');

const v_notificationQueue = [];
const v_processingQueue = new Map(); // user_id -> array de notificaciones

const c_THROTTLE_LIMITS = {
  email: { count: 10, window: 60000 }, // 10 emails por minuto
  push: { count: 20, window: 60000 },  // 20 push por minuto
  in_app: { count: 50, window: 60000 } // 50 in-app por minuto
};

const f_processNotification = async (p_notificationId) => {
  try {
    const v_notification = await Notification.findById(p_notificationId)
      .populate('user_id')
      .populate('template_id');

    if (!v_notification || v_notification.status !== 'pending') {
      return;
    }

    const v_user = v_notification.user_id;
    const v_preferences = await NotificationPreferences.findOne({ 
      user_id: v_user._id 
    });

    if (!f_isNotificationTypeEnabled(v_notification.type, v_preferences)) {
      await Notification.findByIdAndUpdate(p_notificationId, {
        status: 'failed',
        metadata: { ...v_notification.metadata, reason: 'Type disabled by user' }
      });
      return;
    }

    if (f_isInQuietHours(v_preferences)) {
      v_notificationQueue.push(p_notificationId);
      return;
    }

    if (!f_canSendNotification(v_user._id, v_notification.type)) {
      setTimeout(() => {
        v_notificationQueue.push(p_notificationId);
      }, 60000); // Reintentar en 1 minuto
      return;
    }

    let v_result = { success: false };

    switch (v_notification.type) {
      case 'email':
        v_result = await f_sendEmailNotification(
          v_notification, 
          v_user, 
          v_notification.template_id
        );
        break;
      case 'push':
        v_result = await f_sendPushNotification(v_notification, v_user, []);
        break;
      case 'in_app':
        f_sendRealTimeNotification(v_user._id, v_notification);
        v_result = { success: true };
        break;
    }

    const v_updateData = {
      status: v_result.success ? 'sent' : 'failed',
      sent_at: v_result.success ? new Date() : null,
      metadata: {
        ...v_notification.metadata,
        result: v_result
      }
    };

    await Notification.findByIdAndUpdate(p_notificationId, v_updateData);

    f_recordNotificationSent(v_user._id, v_notification.type);

  } catch (p_error) {
    console.error('Error processing notification:', p_error);
    await Notification.findByIdAndUpdate(p_notificationId, {
      status: 'failed',
      metadata: { error: p_error.message }
    });
  }
};

const f_isNotificationTypeEnabled = (p_type, p_preferences) => {
  if (!p_preferences) return true;
  
  switch (p_type) {
    case 'email': return p_preferences.email_enabled;
    case 'push': return p_preferences.push_enabled;
    case 'in_app': return p_preferences.in_app_enabled;
    case 'sms': return p_preferences.sms_enabled;
    default: return true;
  }
};

const f_isInQuietHours = (p_preferences) => {
  if (!p_preferences || !p_preferences.quiet_hours) return false;
  
  const v_now = new Date();
  const v_currentTime = v_now.getHours() * 100 + v_now.getMinutes();
  const v_startTime = parseInt(p_preferences.quiet_hours.start.replace(':', ''));
  const v_endTime = parseInt(p_preferences.quiet_hours.end.replace(':', ''));
  
  if (v_startTime > v_endTime) {
    return v_currentTime >= v_startTime || v_currentTime <= v_endTime;
  } else {
    return v_currentTime >= v_startTime && v_currentTime <= v_endTime;
  }
};

const f_canSendNotification = (p_userId, p_type) => {
  const v_key = `${p_userId}_${p_type}`;
  const v_limit = c_THROTTLE_LIMITS[p_type];
  
  if (!v_limit) return true;
  
  const v_now = Date.now();
  const v_userQueue = v_processingQueue.get(v_key) || [];
  
  const v_validEntries = v_userQueue.filter(
    timestamp => v_now - timestamp < v_limit.window
  );
  
  v_processingQueue.set(v_key, v_validEntries);
  
  return v_validEntries.length < v_limit.count;
};

const f_recordNotificationSent = (p_userId, p_type) => {
  const v_key = `${p_userId}_${p_type}`;
  const v_userQueue = v_processingQueue.get(v_key) || [];
  v_userQueue.push(Date.now());
  v_processingQueue.set(v_key, v_userQueue);
};

const f_processNotificationQueue = async () => {
  const v_batchSize = 10;
  const v_batch = v_notificationQueue.splice(0, v_batchSize);
  
  for (const notificationId of v_batch) {
    await f_processNotification(notificationId);
  }
};

const f_queueNotification = (p_notificationId) => {
  v_notificationQueue.push(p_notificationId);
};

const f_initializeNotificationProcessor = () => {
  cron.schedule('* * * * *', f_processNotificationQueue);
  
  cron.schedule('0 * * * *', () => {
    v_processingQueue.clear();
  });
  
  console.log('Notification processor initialized');
};

module.exports = {
  f_processNotification,
  f_queueNotification,
  f_initializeNotificationProcessor
};
