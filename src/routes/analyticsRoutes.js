const express = require('express');
const {
  f_getEventAnalytics,
  f_generateEventReport,
  f_getAttendanceStats,
  f_getRevenueStats,
  f_getUserEngagement,
  f_getPopularEvents
} = require('../controllers/analyticsController');

const v_router = express.Router();

v_router.get('/events/:eventId', f_getEventAnalytics);
v_router.get('/events/:eventId/report', f_generateEventReport);
v_router.get('/attendance/:eventId', f_getAttendanceStats);
v_router.get('/revenue/:eventId', f_getRevenueStats);
v_router.get('/engagement', f_getUserEngagement);
v_router.get('/popular', f_getPopularEvents);

module.exports = v_router;
