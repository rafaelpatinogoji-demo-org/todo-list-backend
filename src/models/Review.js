const mongoose = require('mongoose');

const c_reviewSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  helpfulness_votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 }
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'reviews'
});

c_reviewSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });

module.exports = mongoose.model('Review', c_reviewSchema);
