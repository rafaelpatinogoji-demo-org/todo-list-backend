const express = require('express');
const {
  f_getAllDeviceTokens,
  f_createDeviceToken,
  f_updateDeviceToken,
  f_deleteDeviceToken
} = require('../controllers/deviceTokenController');

const v_router = express.Router();

v_router.get('/', f_getAllDeviceTokens);
v_router.post('/', f_createDeviceToken);
v_router.put('/:id', f_updateDeviceToken);
v_router.delete('/:id', f_deleteDeviceToken);

module.exports = v_router;
