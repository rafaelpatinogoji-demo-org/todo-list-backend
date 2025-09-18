const mongoose = require('mongoose');

const c_systemMetricsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true
  },
  response_time: {
    type: Number,
    required: true
  },
  status_code: {
    type: Number,
    required: true
  },
  memory_usage: {
    rss: Number,
    heapTotal: Number,
    heapUsed: Number,
    external: Number
  },
  cpu_usage: Number,
  active_connections: Number,
  error_message: String
}, {
  collection: 'system_metrics'
});

c_systemMetricsSchema.index({ timestamp: -1 });
c_systemMetricsSchema.index({ endpoint: 1, timestamp: -1 });
c_systemMetricsSchema.index({ status_code: 1, timestamp: -1 });

module.exports = mongoose.model('SystemMetrics', c_systemMetricsSchema);
