const mongoose = require('mongoose');

const c_eventNotificationSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notification_type: {
    type: String,
    enum: ['reminder', 'cancellation', 'update', 'promotion'],
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
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  }
}, {
  collection: 'event_notifications'
});

module.exports = mongoose.model('EventNotification', c_eventNotificationSchema);
