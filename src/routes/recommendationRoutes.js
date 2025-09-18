const express = require('express');
const {
  f_getCollaborativeRecommendations,
  f_getGenreBasedRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getPersonalizedRecommendations,
  f_getColdStartRecommendations
} = require('../controllers/recommendationController');
const { f_authenticateUser } = require('../middleware/authMiddleware');

const v_router = express.Router();

v_router.get('/trending', f_getTrendingMovies);
v_router.get('/similar/:movieId', f_getSimilarMovies);
v_router.get('/cold-start', f_getColdStartRecommendations);

v_router.get('/collaborative', f_authenticateUser, f_getCollaborativeRecommendations);
v_router.get('/genre-based', f_authenticateUser, f_getGenreBasedRecommendations);
v_router.get('/personalized', f_authenticateUser, f_getPersonalizedRecommendations);

v_router.get('/', f_authenticateUser, f_getPersonalizedRecommendations);

module.exports = v_router;
