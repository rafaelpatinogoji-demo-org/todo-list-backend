const mongoose = require('mongoose');

const c_searchAnalyticsSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true
  },
  search_count: {
    type: Number,
    default: 1
  },
  last_searched: {
    type: Date,
    default: Date.now
  },
  avg_results_count: {
    type: Number,
    default: 0
  },
  search_types: {
    text: { type: Number, default: 0 },
    vector: { type: Number, default: 0 },
    hybrid: { type: Number, default: 0 },
    faceted: { type: Number, default: 0 }
  }
}, {
  collection: 'search_analytics'
});

c_searchAnalyticsSchema.index({ search_count: -1 });
c_searchAnalyticsSchema.index({ last_searched: -1 });

module.exports = mongoose.model('SearchAnalytics', c_searchAnalyticsSchema);
