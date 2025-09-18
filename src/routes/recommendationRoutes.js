const express = require('express');
const {
  f_getPersonalizedRecommendations,
  f_getGenreRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getCollaborativeRecommendationsEndpoint,
  f_submitRating,
  f_recordViewing,
  f_getUserRatings,
  f_getViewingHistory
} = require('../controllers/recommendationController');
const { f_optionalAuth, f_authenticateUser } = require('../middleware/auth');

const v_router = express.Router();

v_router.get('/personalized/:userId?', f_optionalAuth, f_getPersonalizedRecommendations);
v_router.get('/genre/:genre', f_getGenreRecommendations);
v_router.get('/similar/:movieId', f_getSimilarMovies);
v_router.get('/trending', f_getTrendingMovies);
v_router.get('/collaborative/:userId?', f_optionalAuth, f_getCollaborativeRecommendationsEndpoint);

v_router.post('/rate', f_submitRating);
v_router.post('/view', f_recordViewing);
v_router.get('/ratings/:userId', f_getUserRatings);
v_router.get('/history/:userId', f_getViewingHistory);

module.exports = v_router;
