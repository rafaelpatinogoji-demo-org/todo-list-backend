const express = require('express');
const {
  f_getPreferences,
  f_updatePreferences
} = require('../controllers/notificationPreferenceController');

const v_router = express.Router();

v_router.get('/', f_getPreferences);
v_router.put('/', f_updatePreferences);

module.exports = v_router;
