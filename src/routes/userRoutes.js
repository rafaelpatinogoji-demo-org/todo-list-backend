const express = require('express');
const f_jwtAuth = require('../middleware/jwtAuth');
const {
  f_getAllUsers,
  f_getUserById,
  f_createUser,
  f_updateUser,
  f_deleteUser
} = require('../controllers/userController');

const v_router = express.Router();

v_router.get('/', f_jwtAuth, f_getAllUsers);
v_router.get('/:id', f_jwtAuth, f_getUserById);
v_router.post('/', f_createUser);
v_router.put('/:id', f_updateUser);
v_router.delete('/:id', f_deleteUser);

module.exports = v_router;
