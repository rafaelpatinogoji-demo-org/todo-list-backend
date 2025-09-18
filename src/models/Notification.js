const mongoose = require('mongoose');

const c_notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['comment', 'movie_recommendation', 'system', 'promotional'],
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
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  delivery_status: {
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false },
    realtime: { type: Boolean, default: false }
  },
  scheduled_for: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'notifications'
});

module.exports = mongoose.model('Notification', c_notificationSchema);
