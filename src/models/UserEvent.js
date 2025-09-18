const mongoose = require('mongoose');

const c_userEventSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event_type: {
    type: String,
    required: true,
    enum: ['page_view', 'movie_view', 'search', 'comment_create', 'login', 'logout']
  },
  event_data: {
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie'
    },
    search_query: String,
    page_url: String,
    duration: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ip_address: String,
  user_agent: String
}, {
  collection: 'user_events'
});

c_userEventSchema.index({ user_id: 1, timestamp: -1 });
c_userEventSchema.index({ event_type: 1, timestamp: -1 });

module.exports = mongoose.model('UserEvent', c_userEventSchema);
