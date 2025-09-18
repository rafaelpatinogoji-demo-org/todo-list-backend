const express = require('express');
const {
  f_scheduleNotification,
  f_sendNotifications,
  f_getUserNotifications,
  f_markNotificationSent,
  f_getAllNotifications,
  f_getEventNotifications
} = require('../controllers/notificationController');

const v_router = express.Router();

v_router.get('/', f_getAllNotifications);
v_router.get('/user/:userId', f_getUserNotifications);
v_router.get('/event/:eventId', f_getEventNotifications);
v_router.post('/schedule', f_scheduleNotification);
v_router.post('/send', f_sendNotifications);
v_router.put('/:id/sent', f_markNotificationSent);

module.exports = v_router;
