const mongoose = require('mongoose');

const c_userPreferencesSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  preferred_genres: [String],
  disliked_genres: [String],
  preferred_languages: [String],
  min_rating: {
    type: Number,
    default: 0
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'user_preferences'
});

module.exports = mongoose.model('UserPreferences', c_userPreferencesSchema);
