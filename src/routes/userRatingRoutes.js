const express = require('express');
const {
  f_createOrUpdateRating,
  f_getUserRatings,
  f_deleteRating
} = require('../controllers/userRatingController');
const { f_authenticateUser } = require('../middleware/authMiddleware');

const v_router = express.Router();

v_router.use(f_authenticateUser);

v_router.post('/', f_createOrUpdateRating);
v_router.get('/', f_getUserRatings);
v_router.delete('/:movieId', f_deleteRating);

module.exports = v_router;
