const express = require('express');
const {
  f_register,
  f_login,
  f_logout,
  f_refreshToken,
  f_verifyEmail,
  f_requestPasswordReset,
  f_resetPassword
} = require('../controllers/authController');
const { f_authenticateToken } = require('../middleware/authMiddleware');

const v_router = express.Router();

// Rutas públicas
v_router.post('/register', f_register);
v_router.post('/login', f_login);
v_router.post('/refresh-token', f_refreshToken);
v_router.post('/verify-email', f_verifyEmail);
v_router.post('/request-password-reset', f_requestPasswordReset);
v_router.post('/reset-password', f_resetPassword);

// Rutas protegidas
v_router.post('/logout', f_authenticateToken, f_logout);

module.exports = v_router;
