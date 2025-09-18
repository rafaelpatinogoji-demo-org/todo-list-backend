const mongoose = require('mongoose');

const c_movieAnalyticsSchema = new mongoose.Schema({
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
    unique: true
  },
  view_count: {
    type: Number,
    default: 0
  },
  daily_views: [{
    date: {
      type: Date,
      required: true
    },
    views: {
      type: Number,
      default: 0
    }
  }],
  weekly_views: {
    type: Number,
    default: 0
  },
  monthly_views: {
    type: Number,
    default: 0
  },
  trending_score: {
    type: Number,
    default: 0
  },
  average_rating: {
    type: Number,
    default: 0
  },
  comment_count: {
    type: Number,
    default: 0
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'movie_analytics'
});

c_movieAnalyticsSchema.index({ trending_score: -1 });
c_movieAnalyticsSchema.index({ view_count: -1 });
c_movieAnalyticsSchema.index({ weekly_views: -1 });

module.exports = mongoose.model('MovieAnalytics', c_movieAnalyticsSchema);
