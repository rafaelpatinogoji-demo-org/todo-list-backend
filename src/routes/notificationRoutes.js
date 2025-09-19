const express = require('express');
const {
  f_getAllNotifications,
  f_createNotification,
  f_markAsRead,
  f_markAllAsRead,
  f_getNotificationPreferences,
  f_updateNotificationPreferences,
  f_getNotificationStats,
  f_getNotificationById,
  f_deleteNotification
} = require('../controllers/notificationController');

const v_router = express.Router();

v_router.get('/', f_getAllNotifications);
v_router.get('/:id', f_getNotificationById);
v_router.post('/', f_createNotification);
v_router.put('/:id/read', f_markAsRead);
v_router.put('/mark-all-read', f_markAllAsRead);
v_router.delete('/:id', f_deleteNotification);
v_router.get('/stats/:userId', f_getNotificationStats);

v_router.get('/preferences/:userId', f_getNotificationPreferences);
v_router.put('/preferences/:userId', f_updateNotificationPreferences);

module.exports = v_router;
