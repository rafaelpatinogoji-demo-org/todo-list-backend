const express = require('express');
const {
  f_createOrUpdateRating,
  f_getUserRatings,
  f_getMovieRatings,
  f_deleteRating
} = require('../controllers/userRatingController');

const v_router = express.Router();

v_router.post('/', f_createOrUpdateRating);
v_router.get('/user/:userId', f_getUserRatings);
v_router.get('/movie/:movieId', f_getMovieRatings);
v_router.delete('/user/:userId/movie/:movieId', f_deleteRating);

module.exports = v_router;
