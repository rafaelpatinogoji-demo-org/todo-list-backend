const mongoose = require('mongoose');

const c_sessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jwt: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  refreshTokenExpires: {
    type: Date,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'sessions',
  timestamps: true
});

module.exports = mongoose.model('Session', c_sessionSchema);
