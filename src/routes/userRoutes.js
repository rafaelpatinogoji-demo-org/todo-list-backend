const express = require('express');
const {
  f_getAllUsers,
  f_getUserById,
  f_createUser,
  f_updateUser,
  f_deleteUser
} = require('../controllers/userController');
const { f_verifyToken, f_optionalAuth } = require('../middleware/authMiddleware');

const v_router = express.Router();

v_router.get('/', f_optionalAuth, f_getAllUsers);
v_router.get('/:id', f_optionalAuth, f_getUserById);

v_router.post('/', f_verifyToken, f_createUser);
v_router.put('/:id', f_verifyToken, f_updateUser);
v_router.delete('/:id', f_verifyToken, f_deleteUser);

module.exports = v_router;
