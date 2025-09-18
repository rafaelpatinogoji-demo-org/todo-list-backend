const express = require('express');
const {
  f_getUserPreferences,
  f_updateUserPreferences
} = require('../controllers/notificationPreferencesController');

const v_router = express.Router();

v_router.get('/:userId', f_getUserPreferences);
v_router.put('/:userId', f_updateUserPreferences);

module.exports = v_router;
