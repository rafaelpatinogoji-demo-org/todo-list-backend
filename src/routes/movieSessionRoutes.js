const express = require('express');
const {
  f_getAllMovieSessions,
  f_getMovieSessionById,
  f_createMovieSession,
  f_updateMovieSession,
  f_deleteMovieSession,
  f_getAvailableSeats
} = require('../controllers/movieSessionController');

const v_router = express.Router();

v_router.get('/', f_getAllMovieSessions);
v_router.get('/:id', f_getMovieSessionById);
v_router.get('/:id/seats', f_getAvailableSeats);
v_router.post('/', f_createMovieSession);
v_router.put('/:id', f_updateMovieSession);
v_router.delete('/:id', f_deleteMovieSession);

module.exports = v_router;
