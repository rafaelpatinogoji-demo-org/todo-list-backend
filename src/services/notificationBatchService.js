const User = require('../models/User');
const NotificationPreference = require('../models/NotificationPreference');
const emailService = require('./emailService');
const pushNotificationService = require('./pushNotificationService');

class NotificationBatchService {
  constructor() {
    this.batchQueue = new Map();
    this.batchTimeout = parseInt(process.env.NOTIFICATION_BATCH_TIMEOUT) || 5 * 60 * 1000;
    this.maxBatchSize = parseInt(process.env.NOTIFICATION_MAX_BATCH_SIZE) || 10;
    this.batchTimers = new Map();
  }

  addToBatch(userId, notification) {
    if (!this.batchQueue.has(userId)) {
      this.batchQueue.set(userId, []);
      this.scheduleBatchSend(userId);
    }

    const v_userBatch = this.batchQueue.get(userId);
    v_userBatch.push(notification);

    console.log(`Added notification to batch for user ${userId}. Batch size: ${v_userBatch.length}`);

    if (v_userBatch.length >= this.maxBatchSize) {
      this.clearBatchTimer(userId);
      this.sendBatch(userId);
    }
  }

  scheduleBatchSend(userId) {
    const v_timer = setTimeout(() => {
      this.sendBatch(userId);
    }, this.batchTimeout);
    
    this.batchTimers.set(userId, v_timer);
    console.log(`Scheduled batch send for user ${userId} in ${this.batchTimeout}ms`);
  }

  clearBatchTimer(userId) {
    const v_timer = this.batchTimers.get(userId);
    if (v_timer) {
      clearTimeout(v_timer);
      this.batchTimers.delete(userId);
    }
  }

  async sendBatch(userId) {
    const v_batch = this.batchQueue.get(userId);
    if (!v_batch || v_batch.length === 0) {
      this.batchQueue.delete(userId);
      this.clearBatchTimer(userId);
      return;
    }

    try {
      console.log(`Sending batch of ${v_batch.length} notifications for user ${userId}`);

      const v_user = await User.findById(userId);
      const v_preferences = await NotificationPreference.findOne({ user_id: userId });
      
      if (!v_user || !v_preferences) {
        console.log(`User or preferences not found for batch send: ${userId}`);
        this.batchQueue.delete(userId);
        this.clearBatchTimer(userId);
        return;
      }

      const v_deliveryPromises = [];

      if (v_preferences.email_enabled && v_user.email && v_batch.length > 1) {
        v_deliveryPromises.push(
          emailService.sendBatchEmail(v_user.email, v_batch)
            .then(success => ({ type: 'email', success }))
            .catch(error => ({ type: 'email', success: false, error }))
        );
      }

      if (v_preferences.push_enabled && v_batch.length > 1) {
        v_deliveryPromises.push(
          pushNotificationService.sendBatchPushNotification(userId, v_batch)
            .then(success => ({ type: 'push', success }))
            .catch(error => ({ type: 'push', success: false, error }))
        );
      }

      const v_results = await Promise.allSettled(v_deliveryPromises);
      
      v_results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { type, success, error } = result.value;
          if (success) {
            console.log(`Batch ${type} notification sent successfully for user ${userId}`);
          } else {
            console.error(`Batch ${type} notification failed for user ${userId}:`, error);
          }
        }
      });

      this.batchQueue.delete(userId);
      this.clearBatchTimer(userId);
      
    } catch (error) {
      console.error('Batch sending failed:', error);
      this.batchQueue.delete(userId);
      this.clearBatchTimer(userId);
    }
  }

  getBatchStatus(userId) {
    const v_batch = this.batchQueue.get(userId);
    return {
      hasBatch: !!v_batch,
      batchSize: v_batch ? v_batch.length : 0,
      hasTimer: this.batchTimers.has(userId)
    };
  }

  clearUserBatch(userId) {
    this.batchQueue.delete(userId);
    this.clearBatchTimer(userId);
    console.log(`Cleared batch for user ${userId}`);
  }

  getAllBatchStatuses() {
    const v_statuses = {};
    for (const [userId, batch] of this.batchQueue.entries()) {
      v_statuses[userId] = {
        batchSize: batch.length,
        hasTimer: this.batchTimers.has(userId)
      };
    }
    return v_statuses;
  }
}

module.exports = new NotificationBatchService();
