const express = require('express');
const {
  f_getAllComments,
  f_getCommentById,
  f_createComment,
  f_updateComment,
  f_deleteComment,
  f_getCommentsByMovie
} = require('../controllers/commentController');

const v_router = express.Router();

// Obtener todos los comentarios
v_router.get('/', f_getAllComments);
v_router.get('/:id', f_getCommentById);
v_router.get('/movie/:movieId', f_getCommentsByMovie);
v_router.post('/', f_createComment);
v_router.put('/:id', f_updateComment);
v_router.delete('/:id', f_deleteComment);

module.exports = v_router;
