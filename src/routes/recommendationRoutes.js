const express = require('express');
const {
  f_getPersonalizedRecommendations,
  f_getGenreRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getCollaborativeRecommendations
} = require('../controllers/recommendationController');

const v_router = express.Router();

v_router.get('/personalized/:userId', f_getPersonalizedRecommendations);
v_router.get('/genre/:genre', f_getGenreRecommendations);
v_router.get('/similar/:movieId', f_getSimilarMovies);
v_router.get('/trending', f_getTrendingMovies);
v_router.get('/collaborative/:userId', f_getCollaborativeRecommendations);

module.exports = v_router;
