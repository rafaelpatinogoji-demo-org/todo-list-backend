const mongoose = require('mongoose');

const c_searchAnalyticsSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true
  },
  search_count: {
    type: Number,
    default: 1
  },
  avg_results_count: {
    type: Number,
    default: 0
  },
  last_searched: {
    type: Date,
    default: Date.now
  },
  search_types_used: [{
    type: String,
    enum: ['text', 'vector', 'hybrid']
  }]
}, {
  collection: 'search_analytics'
});

module.exports = mongoose.model('SearchAnalytics', c_searchAnalyticsSchema);
