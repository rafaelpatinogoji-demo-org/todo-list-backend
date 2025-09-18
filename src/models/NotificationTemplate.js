const mongoose = require('mongoose');

const c_notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['email', 'push', 'in_app', 'sms'],
    required: true
  },
  subject_template: {
    type: String,
    required: function() { return this.type === 'email'; }
  },
  body_template: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    required: { type: Boolean, default: false }
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  collection: 'notification_templates',
  timestamps: true
});

module.exports = mongoose.model('NotificationTemplate', c_notificationTemplateSchema);
