const mongoose = require('mongoose');

const c_notificationTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  title_template: {
    type: String,
    required: true
  },
  message_template: {
    type: String,
    required: true
  },
  email_template: {
    type: String
  },
  variables: [{
    type: String
  }]
}, {
  collection: 'notification_templates'
});

module.exports = mongoose.model('NotificationTemplate', c_notificationTemplateSchema);
