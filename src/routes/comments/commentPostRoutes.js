const express = require('express');
const {
  f_createComment
} = require('../../controllers/commentController');

const v_router = express.Router();

// Crear nuevo comentario
v_router.post('/', f_createComment);

module.exports = v_router;
