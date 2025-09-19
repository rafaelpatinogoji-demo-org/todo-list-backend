const mongoose = require('mongoose');

const c_userBehaviorSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session_id: {
    type: String,
    required: true
  },
  action_type: {
    type: String,
    required: true,
    enum: ['view_movie', 'search', 'comment', 'login', 'logout', 'browse_genre', 'rate_movie']
  },
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: false
  },
  metadata: {
    search_query: String,
    genre: String,
    rating: Number,
    duration_seconds: Number,
    page_visited: String,
    user_agent: String,
    ip_address: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  consent_given: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'user_behaviors'
});

c_userBehaviorSchema.index({ user_id: 1, timestamp: -1 });
c_userBehaviorSchema.index({ action_type: 1, timestamp: -1 });
c_userBehaviorSchema.index({ movie_id: 1, timestamp: -1 });

module.exports = mongoose.model('UserBehavior', c_userBehaviorSchema);
