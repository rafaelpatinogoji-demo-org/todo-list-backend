const express = require('express');
const {
  f_updateComment
} = require('../../controllers/commentController');

const v_router = express.Router();

// Actualizar comentario por ID
v_router.put('/:id', f_updateComment);

module.exports = v_router;
