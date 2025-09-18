const admin = require('firebase-admin');
const DeviceToken = require('../models/DeviceToken');

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const v_serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(v_serviceAccount)
        });
        this.initialized = true;
        console.log('Firebase Admin SDK initialized');
      } else {
        console.log('Push notification service not configured - missing FIREBASE_SERVICE_ACCOUNT');
      }
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      this.initialized = false;
    }
  }

  async sendPushNotification(userId, notification) {
    try {
      if (!this.initialized) {
        console.log('Push notification service not configured, skipping push send');
        return false;
      }

      const v_deviceTokens = await DeviceToken.find({ 
        user_id: userId, 
        active: true 
      });

      if (v_deviceTokens.length === 0) {
        console.log(`No active device tokens found for user ${userId}`);
        return false;
      }

      const v_tokens = v_deviceTokens.map(dt => dt.token);
      const v_message = {
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          notificationId: notification._id ? notification._id.toString() : 'unknown',
          type: notification.type,
          priority: notification.priority
        },
        tokens: v_tokens
      };

      const v_response = await admin.messaging().sendMulticast(v_message);
      
      if (v_response.failureCount > 0) {
        const v_failedTokens = [];
        v_response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            v_failedTokens.push(v_tokens[idx]);
            console.error(`Push notification failed for token ${v_tokens[idx]}:`, resp.error);
          }
        });
        
        if (v_failedTokens.length > 0) {
          await DeviceToken.updateMany(
            { token: { $in: v_failedTokens } },
            { active: false }
          );
          console.log(`Deactivated ${v_failedTokens.length} failed device tokens`);
        }
      }

      console.log(`Push notification sent to ${v_response.successCount}/${v_tokens.length} devices for user ${userId}`);
      return v_response.successCount > 0;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }

  async sendBatchPushNotification(userId, notifications) {
    try {
      if (!this.initialized) {
        console.log('Push notification service not configured, skipping batch push send');
        return false;
      }

      const v_deviceTokens = await DeviceToken.find({ 
        user_id: userId, 
        active: true 
      });

      if (v_deviceTokens.length === 0) {
        console.log(`No active device tokens found for user ${userId}`);
        return false;
      }

      const v_tokens = v_deviceTokens.map(dt => dt.token);
      const v_message = {
        notification: {
          title: `You have ${notifications.length} new notifications`,
          body: notifications.map(n => n.title).slice(0, 3).join(', ') + (notifications.length > 3 ? '...' : '')
        },
        data: {
          type: 'batch',
          count: notifications.length.toString()
        },
        tokens: v_tokens
      };

      const v_response = await admin.messaging().sendMulticast(v_message);
      
      if (v_response.failureCount > 0) {
        const v_failedTokens = [];
        v_response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            v_failedTokens.push(v_tokens[idx]);
          }
        });
        
        if (v_failedTokens.length > 0) {
          await DeviceToken.updateMany(
            { token: { $in: v_failedTokens } },
            { active: false }
          );
        }
      }

      console.log(`Batch push notification sent to ${v_response.successCount}/${v_tokens.length} devices for user ${userId}`);
      return v_response.successCount > 0;
    } catch (error) {
      console.error('Batch push notification failed:', error);
      return false;
    }
  }
}

module.exports = new PushNotificationService();
