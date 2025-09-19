const express = require('express');
const {
  f_getSystemMetrics,
  f_getUserBehaviorAnalytics,
  f_getMoviePopularityMetrics,
  f_getTrendingMetrics,
  f_getRevenueAnalytics,
  f_createCustomDashboard,
  f_exportAnalyticsData,
  f_getPerformanceMetrics,
  f_updateTrackingConsent
} = require('../controllers/analyticsController');

const { f_trackUserBehavior } = require('../middleware/trackingMiddleware');

const v_router = express.Router();

v_router.get('/system-metrics', f_getSystemMetrics);
v_router.get('/performance', f_getPerformanceMetrics);

v_router.get('/user-behavior', f_getUserBehaviorAnalytics);
v_router.put('/tracking-consent', f_updateTrackingConsent);

v_router.get('/movie-popularity', f_trackUserBehavior('browse_analytics'), f_getMoviePopularityMetrics);
v_router.get('/trending', f_trackUserBehavior('browse_analytics'), f_getTrendingMetrics);

v_router.get('/revenue', f_getRevenueAnalytics);

v_router.post('/dashboard', f_createCustomDashboard);

v_router.get('/export', f_exportAnalyticsData);

v_router.get('/summary', async (p_req, p_res) => {
  try {
    const UserBehavior = require('../models/UserBehavior');
    const MovieAnalytics = require('../models/MovieAnalytics');
    const SystemMetrics = require('../models/SystemMetrics');
    const RevenueAnalytics = require('../models/RevenueAnalytics');
    
    const v_summary = {
      user_behaviors: await UserBehavior.countDocuments({ consent_given: true }),
      movie_analytics: await MovieAnalytics.countDocuments(),
      system_metrics: await SystemMetrics.countDocuments(),
      revenue_records: await RevenueAnalytics.countDocuments(),
      last_updated: new Date()
    };
    
    const v_recentActivity = await UserBehavior.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          consent_given: true
        }
      },
      {
        $group: {
          _id: '$action_type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    p_res.json({
      summary: v_summary,
      recent_activity: v_recentActivity,
      available_endpoints: {
        system_metrics: '/api/analytics/system-metrics',
        user_behavior: '/api/analytics/user-behavior',
        movie_popularity: '/api/analytics/movie-popularity',
        trending: '/api/analytics/trending',
        revenue: '/api/analytics/revenue',
        performance: '/api/analytics/performance',
        export: '/api/analytics/export',
        dashboard: '/api/analytics/dashboard'
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
});

module.exports = v_router;
