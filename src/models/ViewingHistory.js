const mongoose = require('mongoose');

const c_viewingHistorySchema = new mongoose.Schema({
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
  viewed_at: {
    type: Date,
    default: Date.now
  },
  watch_duration: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  collection: 'viewing_history'
});

c_viewingHistorySchema.index({ user_id: 1, viewed_at: -1 });
c_viewingHistorySchema.index({ movie_id: 1 });

module.exports = mongoose.model('ViewingHistory', c_viewingHistorySchema);
