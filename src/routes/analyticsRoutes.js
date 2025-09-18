const express = require('express');
const {
  f_getUserBehaviorAnalytics,
  f_getMoviePopularityMetrics,
  f_getRevenueAnalytics,
  f_getSystemHealthMetrics,
  f_getDashboardData,
  f_exportAnalyticsData
} = require('../controllers/analyticsController');

const v_router = express.Router();

v_router.get('/user-behavior', f_getUserBehaviorAnalytics);
v_router.get('/movie-popularity', f_getMoviePopularityMetrics);
v_router.get('/revenue', f_getRevenueAnalytics);
v_router.get('/system-health', f_getSystemHealthMetrics);
v_router.get('/dashboard/:role', f_getDashboardData);
v_router.get('/export/:format', f_exportAnalyticsData);

module.exports = v_router;
