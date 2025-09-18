const mongoose = require('mongoose');

const c_dashboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  user_role: {
    type: String,
    required: true,
    enum: ['admin', 'manager', 'user']
  },
  widgets: [{
    type: {
      type: String,
      required: true,
      enum: ['chart', 'metric', 'table', 'map']
    },
    title: String,
    data_source: String,
    config: mongoose.Schema.Types.Mixed,
    position: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    }
  }],
  is_default: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'dashboards'
});

c_dashboardSchema.index({ user_role: 1, is_default: -1 });

module.exports = mongoose.model('Dashboard', c_dashboardSchema);
