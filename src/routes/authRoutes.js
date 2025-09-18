const express = require('express');
const {
  f_register,
  f_login,
  f_logout,
  f_refreshToken,
  f_verifyEmail,
  f_forgotPassword,
  f_resetPassword
} = require('../controllers/authController');
const { f_verifyToken } = require('../middleware/authMiddleware');

const v_router = express.Router();

v_router.post('/register', f_register);
v_router.post('/login', f_login);
v_router.post('/refresh-token', f_refreshToken);
v_router.get('/verify-email/:token', f_verifyEmail);
v_router.post('/forgot-password', f_forgotPassword);
v_router.post('/reset-password', f_resetPassword);

v_router.post('/logout', f_verifyToken, f_logout);

module.exports = v_router;
