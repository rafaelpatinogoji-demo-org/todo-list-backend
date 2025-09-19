const mongoose = require('mongoose');

const c_recommendationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmbeddedMovie',
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  algorithm_type: {
    type: String,
    enum: ['collaborative', 'content_based', 'genre_based', 'trending', 'hybrid'],
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true
  }
}, {
  collection: 'recommendations'
});

c_recommendationSchema.index({ user_id: 1, algorithm_type: 1, score: -1 });
c_recommendationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Recommendation', c_recommendationSchema);
