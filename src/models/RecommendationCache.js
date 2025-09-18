const mongoose = require('mongoose');

const c_recommendationCacheSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recommendation_type: {
    type: String,
    required: true,
    enum: ['personalized', 'collaborative', 'trending', 'genre', 'similar']
  },
  context: {
    type: String,
    default: null
  },
  recommendations: [{
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmbeddedMovie'
    },
    score: Number,
    reason: String
  }],
  generated_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
}, {
  collection: 'recommendation_cache'
});

c_recommendationCacheSchema.index({ user_id: 1, recommendation_type: 1, context: 1 });
c_recommendationCacheSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RecommendationCache', c_recommendationCacheSchema);
