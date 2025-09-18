const express = require('express');
const {
  f_getEventAttendance,
  f_getPromotionPerformance,
  f_getRevenueAnalytics,
  f_getPopularEvents,
  f_getDashboardAnalytics
} = require('../controllers/analyticsController');

const v_router = express.Router();

v_router.get('/dashboard', f_getDashboardAnalytics);
v_router.get('/popular-events', f_getPopularEvents);
v_router.get('/revenue', f_getRevenueAnalytics);
v_router.get('/attendance/:eventId', f_getEventAttendance);
v_router.get('/promotion/:promotionId', f_getPromotionPerformance);

module.exports = v_router;
