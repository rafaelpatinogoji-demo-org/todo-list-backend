const express = require('express');
const {
  f_getAllMovies,
  f_getMovieById,
  f_createMovie,
  f_updateMovie,
  f_deleteMovie,
  f_searchMovies
} = require('../controllers/movieController');
const { f_trackUserBehavior } = require('../middleware/trackingMiddleware');

const v_router = express.Router();

// Obtener todas las películas
v_router.get('/', f_trackUserBehavior('browse_genre'), f_getAllMovies);
// Buscar películas por criterios
v_router.get('/search', f_trackUserBehavior('search'), f_searchMovies);
// Obtener una película por ID
v_router.get('/:id', f_trackUserBehavior('view_movie'), f_getMovieById);
// Crear una nueva película
v_router.post('/', f_createMovie);
// Actualizar una película por ID
v_router.put('/:id', f_updateMovie);
// Eliminar una película por ID
v_router.delete('/:id', f_deleteMovie);

module.exports = v_router;
