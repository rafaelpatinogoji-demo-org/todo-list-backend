const express = require('express');
const {
  f_getAllNotifications,
  f_getNotificationById,
  f_createNotification,
  f_markAsRead,
  f_markMultipleAsRead,
  f_getNotificationStats
} = require('../controllers/notificationController');

const v_router = express.Router();

v_router.get('/', f_getAllNotifications);
v_router.get('/stats', f_getNotificationStats);
v_router.get('/:id', f_getNotificationById);
v_router.post('/', f_createNotification);
v_router.patch('/:id/read', f_markAsRead);
v_router.patch('/read-multiple', f_markMultipleAsRead);

module.exports = v_router;
