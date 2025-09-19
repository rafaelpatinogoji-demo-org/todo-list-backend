const mongoose = require('mongoose');

const c_userRatingSchema = new mongoose.Schema({
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
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  interaction_type: {
    type: String,
    enum: ['rating', 'view', 'like'],
    default: 'rating'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'user_ratings'
});

c_userRatingSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });
c_userRatingSchema.index({ user_id: 1, timestamp: -1 });
c_userRatingSchema.index({ movie_id: 1, rating: -1 });

module.exports = mongoose.model('UserRating', c_userRatingSchema);
