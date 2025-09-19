const mongoose = require('mongoose');

const c_systemMetricsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  api_metrics: {
    total_requests: Number,
    successful_requests: Number,
    failed_requests: Number,
    average_response_time: Number,
    peak_response_time: Number,
    endpoints_performance: [{
      endpoint: String,
      request_count: Number,
      average_response_time: Number,
      error_rate: Number
    }]
  },
  database_metrics: {
    connection_count: Number,
    query_count: Number,
    average_query_time: Number,
    slow_queries: Number,
    database_size: Number
  },
  user_metrics: {
    active_users: Number,
    new_registrations: Number,
    concurrent_sessions: Number,
    peak_concurrent_users: Number
  },
  system_health: {
    cpu_usage: Number,
    memory_usage: Number,
    disk_usage: Number,
    uptime_seconds: Number,
    status: {
      type: String,
      enum: ['healthy', 'warning', 'critical'],
      default: 'healthy'
    }
  }
}, {
  collection: 'system_metrics'
});

c_systemMetricsSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SystemMetrics', c_systemMetricsSchema);
