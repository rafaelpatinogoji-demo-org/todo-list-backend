const mongoose = require('mongoose');

const c_revenueAnalyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  theater_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: false
  },
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: false
  },
  revenue_data: {
    total_bookings: {
      type: Number,
      default: 0
    },
    total_revenue: {
      type: Number,
      default: 0
    },
    average_ticket_price: {
      type: Number,
      default: 0
    },
    occupancy_rate: {
      type: Number,
      default: 0
    }
  },
  booking_metrics: {
    online_bookings: Number,
    offline_bookings: Number,
    cancelled_bookings: Number,
    refunded_amount: Number
  },
  demographic_data: {
    age_groups: [{
      range: String,
      count: Number,
      revenue: Number
    }],
    gender_distribution: [{
      gender: String,
      count: Number,
      revenue: Number
    }]
  },
  time_slot_performance: [{
    time_slot: String,
    bookings: Number,
    revenue: Number,
    occupancy_rate: Number
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'revenue_analytics'
});

c_revenueAnalyticsSchema.index({ date: -1 });
c_revenueAnalyticsSchema.index({ theater_id: 1, date: -1 });
c_revenueAnalyticsSchema.index({ movie_id: 1, date: -1 });

module.exports = mongoose.model('RevenueAnalytics', c_revenueAnalyticsSchema);
