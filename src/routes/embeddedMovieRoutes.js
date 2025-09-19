const express = require('express');
const f_jwtAuth = require('../middleware/jwtAuth');
const {
  f_getAllEmbeddedMovies,
  f_getEmbeddedMovieById,
  f_createEmbeddedMovie,
  f_updateEmbeddedMovie,
  f_deleteEmbeddedMovie,
  f_searchEmbeddedMovies
} = require('../controllers/embeddedMovieController');

const v_router = express.Router();

v_router.get('/', f_jwtAuth, f_getAllEmbeddedMovies);
v_router.get('/search', f_jwtAuth, f_searchEmbeddedMovies);
v_router.get('/:id', f_jwtAuth, f_getEmbeddedMovieById);
v_router.post('/', f_createEmbeddedMovie);
v_router.put('/:id', f_updateEmbeddedMovie);
v_router.delete('/:id', f_deleteEmbeddedMovie);

module.exports = v_router;
