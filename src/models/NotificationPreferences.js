const mongoose = require('mongoose');

const c_notificationPreferencesSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  email_enabled: {
    type: Boolean,
    default: true
  },
  push_enabled: {
    type: Boolean,
    default: true
  },
  in_app_enabled: {
    type: Boolean,
    default: true
  },
  sms_enabled: {
    type: Boolean,
    default: false
  },
  frequency: {
    type: String,
    enum: ['immediate', 'hourly', 'daily', 'weekly'],
    default: 'immediate'
  },
  quiet_hours: {
    start: { type: String, default: '22:00' },
    end: { type: String, default: '08:00' }
  }
}, {
  collection: 'notification_preferences',
  timestamps: true
});

module.exports = mongoose.model('NotificationPreferences', c_notificationPreferencesSchema);
