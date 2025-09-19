const express = require('express');
const {
  f_getAllReviews,
  f_getReviewById,
  f_createReview,
  f_updateReview,
  f_deleteReview,
  f_getReviewsByMovie,
  f_getReviewsByUser,
  f_moderateReview,
  f_voteReviewHelpfulness,
  f_getMovieRatingStats
} = require('../controllers/reviewController');

const v_router = express.Router();

v_router.get('/', f_getAllReviews);
v_router.get('/:id', f_getReviewById);
v_router.get('/movie/:movieId', f_getReviewsByMovie);
v_router.get('/user/:userId', f_getReviewsByUser);
v_router.get('/movie/:movieId/stats', f_getMovieRatingStats);
v_router.post('/', f_createReview);
v_router.put('/:id', f_updateReview);
v_router.delete('/:id', f_deleteReview);
v_router.patch('/:id/moderate', f_moderateReview);
v_router.patch('/:id/vote', f_voteReviewHelpfulness);

module.exports = v_router;
