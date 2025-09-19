const express = require('express');
const {
  f_getAllMovieSessions,
  f_getMovieSessionById,
  f_createMovieSession,
  f_getAvailableSeats
} = require('../controllers/movieSessionController');

const v_router = express.Router();

v_router.get('/', f_getAllMovieSessions);
v_router.get('/:id', f_getMovieSessionById);
v_router.post('/', f_createMovieSession);
v_router.get('/:id/seats', f_getAvailableSeats);

module.exports = v_router;
