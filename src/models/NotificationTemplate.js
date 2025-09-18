const mongoose = require('mongoose');

const c_notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['comment', 'movie_recommendation', 'system', 'promotional'],
    required: true
  },
  subject_template: {
    type: String,
    required: true
  },
  body_template: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    required: Boolean
  }],
  active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'notification_templates'
});

module.exports = mongoose.model('NotificationTemplate', c_notificationTemplateSchema);
