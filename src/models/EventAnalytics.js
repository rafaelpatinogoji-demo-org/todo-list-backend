const mongoose = require('mongoose');

const c_eventAnalyticsSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    unique: true
  },
  total_tickets_sold: {
    type: Number,
    default: 0,
    min: 0
  },
  total_revenue: {
    type: Number,
    default: 0,
    min: 0
  },
  attendance_count: {
    type: Number,
    default: 0,
    min: 0
  },
  average_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  feedback_count: {
    type: Number,
    default: 0,
    min: 0
  },
  demographics: {
    age_groups: {
      under_18: { type: Number, default: 0 },
      age_18_25: { type: Number, default: 0 },
      age_26_35: { type: Number, default: 0 },
      age_36_50: { type: Number, default: 0 },
      over_50: { type: Number, default: 0 }
    },
    gender: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    }
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'event_analytics'
});

module.exports = mongoose.model('EventAnalytics', c_eventAnalyticsSchema);
