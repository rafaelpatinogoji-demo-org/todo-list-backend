const mongoose = require('mongoose');

const c_userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  preferences: {
    favorite_genres: [String],
    disliked_genres: [String],
    preferred_languages: [String],
    min_rating: {
      type: Number,
      default: 0
    }
  },
  onboarding_completed: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'users'
});

module.exports = mongoose.model('User', c_userSchema);
