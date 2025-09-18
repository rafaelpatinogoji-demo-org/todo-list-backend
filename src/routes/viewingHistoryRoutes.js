const express = require('express');
const {
  f_recordView,
  f_getUserViewingHistory,
  f_getMovieViewStats
} = require('../controllers/viewingHistoryController');

const v_router = express.Router();

v_router.post('/', f_recordView);
v_router.get('/user/:userId', f_getUserViewingHistory);
v_router.get('/movie/:movieId/stats', f_getMovieViewStats);

module.exports = v_router;
