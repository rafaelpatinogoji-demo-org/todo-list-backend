const express = require('express');
const {
  f_getAllUsers,
  f_getUserById,
  f_createUser,
  f_updateUser,
  f_deleteUser
} = require('../controllers/userController');
const { f_authenticateToken } = require('../middleware/authMiddleware');

const v_router = express.Router();

// Rutas públicas
v_router.get('/', f_getAllUsers);
v_router.get('/:id', f_getUserById);
v_router.post('/', f_createUser);

// Rutas protegidas (requieren autenticación)
v_router.put('/:id', f_authenticateToken, f_updateUser);
v_router.delete('/:id', f_authenticateToken, f_deleteUser);

// Ruta para obtener perfil del usuario autenticado
v_router.get('/profile/me', f_authenticateToken, (p_req, p_res) => {
  p_res.json(p_req.user);
});

module.exports = v_router;
