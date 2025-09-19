const mongoose = require('mongoose');

const c_auditLogSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  target_type: {
    type: String,
    enum: ['user', 'movie', 'theater', 'session', 'comment'],
    required: true
  },
  target_id: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'audit_logs'
});

module.exports = mongoose.model('AuditLog', c_auditLogSchema);
