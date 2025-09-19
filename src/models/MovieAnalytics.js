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
  unique_viewers: {
    type: Number,
    default: 0
  },
  comment_count: {
    type: Number,
    default: 0
  },
  average_rating: {
    type: Number,
    default: 0
  },
  rating_count: {
    type: Number,
    default: 0
  },
  popularity_score: {
    type: Number,
    default: 0
  },
  trending_score: {
    type: Number,
    default: 0
  },
  genre_performance: [{
    genre: String,
    score: Number
  }],
  daily_views: [{
    date: Date,
    views: Number,
    unique_viewers: Number
  }],
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'movie_analytics'
});

c_movieAnalyticsSchema.index({ popularity_score: -1 });
c_movieAnalyticsSchema.index({ trending_score: -1 });
c_movieAnalyticsSchema.index({ 'genre_performance.genre': 1, 'genre_performance.score': -1 });

module.exports = mongoose.model('MovieAnalytics', c_movieAnalyticsSchema);
