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
    min: 1,
    max: 5,
    required: true
  },
  viewed_at: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'user_ratings'
});

c_userRatingSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });
c_userRatingSchema.index({ movie_id: 1 });
c_userRatingSchema.index({ rating: -1 });

module.exports = mongoose.model('UserRating', c_userRatingSchema);
