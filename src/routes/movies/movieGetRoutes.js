const express = require('express');
const {
  f_getAllMovies,
  f_getMovieById,
  f_searchMovies
} = require('../../controllers/movieController');

const v_router = express.Router();

// Obtener todas las películas
v_router.get('/', f_getAllMovies);

// Buscar películas por criterios
v_router.get('/search', f_searchMovies);

// Obtener una película por ID
v_router.get('/:id', f_getMovieById);

module.exports = v_router;
