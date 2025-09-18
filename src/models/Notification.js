const mongoose = require('mongoose');

const c_notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'push', 'in_app', 'sms'],
    required: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
    default: 'pending'
  },
  read_at: {
    type: Date,
    default: null
  },
  sent_at: {
    type: Date,
    default: null
  },
  delivered_at: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  template_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NotificationTemplate',
    required: false
  }
}, {
  collection: 'notifications',
  timestamps: true
});

module.exports = mongoose.model('Notification', c_notificationSchema);
