const express = require('express');
const {
  f_getAllNotifications,
  f_getNotificationById,
  f_createNotification,
  f_sendNotification,
  f_getNotificationsByUser,
  f_markAsRead,
  f_scheduleReminder
} = require('../controllers/notificationController');

const v_router = express.Router();

v_router.get('/', f_getAllNotifications);
v_router.get('/user/:userId', f_getNotificationsByUser);
v_router.get('/:id', f_getNotificationById);
v_router.post('/', f_createNotification);
v_router.post('/schedule', f_scheduleReminder);
v_router.put('/:id/send', f_sendNotification);
v_router.put('/:id/read', f_markAsRead);

module.exports = v_router;
