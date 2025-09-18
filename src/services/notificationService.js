const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');
const socketService = require('./socketService');
const emailService = require('./emailService');
const pushNotificationService = require('./pushNotificationService');
const { f_createDefaultPreferences } = require('../controllers/notificationPreferenceController');

class NotificationService {
  async createNotification(notificationData) {
    try {
      const v_notification = new Notification(notificationData);
      await v_notification.save();

      let v_preferences = await NotificationPreference.findOne({ 
        user_id: notificationData.user_id 
      });

      if (!v_preferences) {
        v_preferences = await f_createDefaultPreferences(notificationData.user_id);
      }

      if (!this.shouldSendNotification(v_preferences, notificationData.type)) {
        console.log(`Notification blocked by user preferences for type: ${notificationData.type}`);
        return v_notification;
      }

      if (this.isQuietHours(v_preferences.quiet_hours)) {
        console.log('Notification delayed due to quiet hours');
        return v_notification;
      }

      await this.deliverNotification(v_notification, v_preferences);

      return v_notification;
    } catch (error) {
      console.error('Notification creation failed:', error);
      throw error;
    }
  }

  async deliverNotification(notification, preferences) {
    const v_deliveryPromises = [];

    if (preferences?.realtime_enabled) {
      v_deliveryPromises.push(this.sendRealtimeNotification(notification));
    }

    if (preferences?.email_enabled) {
      v_deliveryPromises.push(this.sendEmailNotification(notification));
    }

    if (preferences?.push_enabled) {
      v_deliveryPromises.push(this.sendPushNotification(notification));
    }

    await Promise.allSettled(v_deliveryPromises);
  }

  async sendRealtimeNotification(notification) {
    try {
      socketService.sendNotificationToUser(notification.user_id, notification);
      await Notification.findByIdAndUpdate(notification._id, {
        'delivery_status.realtime': true
      });
      return true;
    } catch (error) {
      console.error('Real-time notification failed:', error);
      return false;
    }
  }

  async sendEmailNotification(notification) {
    try {
      const v_user = await User.findById(notification.user_id);
      if (!v_user || !v_user.email) {
        console.log(`No email found for user ${notification.user_id}`);
        return false;
      }

      const v_success = await emailService.sendNotificationEmail(
        v_user.email, 
        notification
      );
      
      if (v_success) {
        await Notification.findByIdAndUpdate(notification._id, {
          'delivery_status.email': true
        });
      }
      
      return v_success;
    } catch (error) {
      console.error('Email notification failed:', error);
      return false;
    }
  }

  async sendPushNotification(notification) {
    try {
      const v_success = await pushNotificationService.sendPushNotification(
        notification.user_id, 
        notification
      );
      
      if (v_success) {
        await Notification.findByIdAndUpdate(notification._id, {
          'delivery_status.push': true
        });
      }
      
      return v_success;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }

  shouldSendNotification(preferences, notificationType) {
    if (!preferences) return true;
    return preferences.notification_types[notificationType] !== false;
  }

  isQuietHours(quietHours) {
    if (!quietHours?.enabled) return false;
    
    const v_now = new Date();
    const v_currentTime = v_now.getHours() * 100 + v_now.getMinutes();
    const v_startTime = this.parseTime(quietHours.start_time);
    const v_endTime = this.parseTime(quietHours.end_time);
    
    if (v_startTime <= v_endTime) {
      return v_currentTime >= v_startTime && v_currentTime <= v_endTime;
    } else {
      return v_currentTime >= v_startTime || v_currentTime <= v_endTime;
    }
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  async createBulkNotifications(notifications) {
    try {
      const v_savedNotifications = await Notification.insertMany(notifications);
      
      for (const notification of v_savedNotifications) {
        this.createNotification({
          ...notification.toObject(),
          _id: notification._id
        }).catch(error => {
          console.error(`Failed to deliver notification ${notification._id}:`, error);
        });
      }

      return v_savedNotifications;
    } catch (error) {
      console.error('Bulk notification creation failed:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
