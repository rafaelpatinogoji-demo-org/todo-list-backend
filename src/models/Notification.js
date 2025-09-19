const mongoose = require('mongoose');

const c_notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  notification_type: {
    type: String,
    enum: ['reminder', 'cancellation', 'update', 'confirmation'],
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
  scheduled_date: {
    type: Date,
    required: true
  },
  sent_date: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled'
  },
  delivery_method: {
    type: String,
    enum: ['email', 'sms', 'push'],
    default: 'email'
  },
  created_date: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'notifications'
});

module.exports = mongoose.model('Notification', c_notificationSchema);
