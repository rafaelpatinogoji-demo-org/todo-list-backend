const express = require('express');
const {
  f_deleteComment
} = require('../../controllers/commentController');

const v_router = express.Router();

// Eliminar comentario por ID
v_router.delete('/:id', f_deleteComment);

module.exports = v_router;
