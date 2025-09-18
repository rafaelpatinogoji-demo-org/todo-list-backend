const mongoose = require('mongoose');

const c_deviceTokenSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  last_used: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'device_tokens'
});

module.exports = mongoose.model('DeviceToken', c_deviceTokenSchema);
