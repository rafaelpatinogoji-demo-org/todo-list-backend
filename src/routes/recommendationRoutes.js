const express = require('express');
const {
  f_getPersonalizedRecommendations,
  f_getColdStartRecommendations,
  f_getGenreBasedRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getCollaborativeRecommendations,
  f_createUserRating,
  f_getUserRatings
} = require('../controllers/recommendationController');

const v_router = express.Router();

v_router.get('/personalized/:userId', f_getPersonalizedRecommendations);
v_router.get('/cold-start', f_getColdStartRecommendations);
v_router.get('/genre/:genre', f_getGenreBasedRecommendations);
v_router.get('/similar/:movieId', f_getSimilarMovies);
v_router.get('/trending', f_getTrendingMovies);
v_router.get('/collaborative/:userId', f_getCollaborativeRecommendations);

v_router.post('/rate', f_createUserRating);
v_router.get('/user-ratings/:userId', f_getUserRatings);

module.exports = v_router;
