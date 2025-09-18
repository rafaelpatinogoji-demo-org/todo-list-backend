const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const c_notificationAnalyticsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  notification_type: { type: String, required: true },
  total_sent: { type: Number, default: 0 },
  email_sent: { type: Number, default: 0 },
  push_sent: { type: Number, default: 0 },
  realtime_sent: { type: Number, default: 0 },
  opened: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 }
}, {
  collection: 'notification_analytics'
});

const NotificationAnalytics = mongoose.model('NotificationAnalytics', c_notificationAnalyticsSchema);

class NotificationAnalyticsService {
  async trackNotificationSent(type, deliveryChannels) {
    try {
      const v_today = new Date();
      v_today.setHours(0, 0, 0, 0);

      await NotificationAnalytics.findOneAndUpdate(
        { date: v_today, notification_type: type },
        {
          $inc: {
            total_sent: 1,
            email_sent: deliveryChannels.email ? 1 : 0,
            push_sent: deliveryChannels.push ? 1 : 0,
            realtime_sent: deliveryChannels.realtime ? 1 : 0
          }
        },
        { upsert: true }
      );

      console.log(`Tracked notification sent: ${type}`, deliveryChannels);
    } catch (error) {
      console.error('Failed to track notification sent:', error);
    }
  }

  async trackNotificationOpened(notificationId) {
    try {
      const v_notification = await Notification.findById(notificationId);
      if (!v_notification) {
        console.log(`Notification not found for tracking: ${notificationId}`);
        return;
      }

      const v_today = new Date();
      v_today.setHours(0, 0, 0, 0);

      await NotificationAnalytics.findOneAndUpdate(
        { date: v_today, notification_type: v_notification.type },
        { $inc: { opened: 1 } },
        { upsert: true }
      );

      console.log(`Tracked notification opened: ${v_notification.type}`);
    } catch (error) {
      console.error('Failed to track notification opened:', error);
    }
  }

  async trackNotificationClicked(notificationId) {
    try {
      const v_notification = await Notification.findById(notificationId);
      if (!v_notification) {
        console.log(`Notification not found for tracking: ${notificationId}`);
        return;
      }

      const v_today = new Date();
      v_today.setHours(0, 0, 0, 0);

      await NotificationAnalytics.findOneAndUpdate(
        { date: v_today, notification_type: v_notification.type },
        { $inc: { clicked: 1 } },
        { upsert: true }
      );

      console.log(`Tracked notification clicked: ${v_notification.type}`);
    } catch (error) {
      console.error('Failed to track notification clicked:', error);
    }
  }

  async getAnalytics(startDate, endDate, notificationType = null) {
    try {
      const v_filter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (notificationType) {
        v_filter.notification_type = notificationType;
      }

      const v_analytics = await NotificationAnalytics.find(v_filter)
        .sort({ date: -1 });

      return v_analytics;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  async getDailyStats(date = new Date()) {
    try {
      const v_targetDate = new Date(date);
      v_targetDate.setHours(0, 0, 0, 0);

      const v_stats = await NotificationAnalytics.find({ date: v_targetDate });
      
      const v_summary = {
        date: v_targetDate,
        total_sent: 0,
        email_sent: 0,
        push_sent: 0,
        realtime_sent: 0,
        opened: 0,
        clicked: 0,
        by_type: {}
      };

      v_stats.forEach(stat => {
        v_summary.total_sent += stat.total_sent;
        v_summary.email_sent += stat.email_sent;
        v_summary.push_sent += stat.push_sent;
        v_summary.realtime_sent += stat.realtime_sent;
        v_summary.opened += stat.opened;
        v_summary.clicked += stat.clicked;
        
        v_summary.by_type[stat.notification_type] = {
          total_sent: stat.total_sent,
          email_sent: stat.email_sent,
          push_sent: stat.push_sent,
          realtime_sent: stat.realtime_sent,
          opened: stat.opened,
          clicked: stat.clicked
        };
      });

      return v_summary;
    } catch (error) {
      console.error('Failed to get daily stats:', error);
      throw error;
    }
  }

  async getWeeklyStats(weekStartDate = null) {
    try {
      const v_startDate = weekStartDate ? new Date(weekStartDate) : new Date();
      if (!weekStartDate) {
        v_startDate.setDate(v_startDate.getDate() - v_startDate.getDay());
      }
      v_startDate.setHours(0, 0, 0, 0);

      const v_endDate = new Date(v_startDate);
      v_endDate.setDate(v_endDate.getDate() + 6);
      v_endDate.setHours(23, 59, 59, 999);

      return await this.getAnalytics(v_startDate, v_endDate);
    } catch (error) {
      console.error('Failed to get weekly stats:', error);
      throw error;
    }
  }
}

module.exports = new NotificationAnalyticsService();
