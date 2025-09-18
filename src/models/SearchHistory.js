const mongoose = require('mongoose');

const c_searchHistorySchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  query: {
    type: String,
    required: true
  },
  search_type: {
    type: String,
    enum: ['text', 'vector', 'hybrid', 'faceted'],
    required: true
  },
  filters: mongoose.Schema.Types.Mixed,
  results_count: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'search_history'
});

c_searchHistorySchema.index({ user_id: 1, timestamp: -1 });

module.exports = mongoose.model('SearchHistory', c_searchHistorySchema);
