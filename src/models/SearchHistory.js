const mongoose = require('mongoose');

const c_searchHistorySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  results_count: {
    type: Number,
    default: 0
  },
  search_type: {
    type: String,
    enum: ['text', 'vector', 'hybrid'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'search_history'
});

module.exports = mongoose.model('SearchHistory', c_searchHistorySchema);
