const express = require('express');
const f_jwtAuth = require('../middleware/jwtAuth');
const {
  f_getAllMovies,
  f_getMovieById,
  f_createMovie,
  f_updateMovie,
  f_deleteMovie,
  f_searchMovies
} = require('../controllers/movieController');

const v_router = express.Router();

v_router.get('/', f_jwtAuth, f_getAllMovies);
v_router.get('/search', f_jwtAuth, f_searchMovies);
v_router.get('/:id', f_jwtAuth, f_getMovieById);
v_router.post('/', f_createMovie);
v_router.put('/:id', f_updateMovie);
v_router.delete('/:id', f_deleteMovie);

module.exports = v_router;
