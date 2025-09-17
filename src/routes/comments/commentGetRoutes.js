const express = require('express');
const {
  f_getAllComments,
  f_getCommentById,
  f_getCommentsByMovie
} = require('../../controllers/commentController');

const v_router = express.Router();

// Obtener todos los comentarios
v_router.get('/', f_getAllComments);

// Obtener comentario por ID
v_router.get('/:id', f_getCommentById);

// Obtener comentarios por película
v_router.get('/movie/:movieId', f_getCommentsByMovie);

module.exports = v_router;
