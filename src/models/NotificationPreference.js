const mongoose = require('mongoose');

const c_notificationPreferenceSchema = new mongoose.Schema({
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
  realtime_enabled: {
    type: Boolean,
    default: true
  },
  notification_types: {
    comment: { type: Boolean, default: true },
    movie_recommendation: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
    promotional: { type: Boolean, default: false }
  },
  quiet_hours: {
    enabled: { type: Boolean, default: false },
    start_time: { type: String, default: '22:00' },
    end_time: { type: String, default: '08:00' }
  },
  frequency: {
    type: String,
    enum: ['immediate', 'hourly', 'daily', 'weekly'],
    default: 'immediate'
  }
}, {
  collection: 'notification_preferences'
});

module.exports = mongoose.model('NotificationPreference', c_notificationPreferenceSchema);
