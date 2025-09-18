const express = require('express');
const {
  f_getAllEvents,
  f_getEventById,
  f_createEvent,
  f_updateEvent,
  f_deleteEvent,
  f_searchEvents,
  f_getEventsByMovie,
  f_getEventsByTheater,
  f_getUpcomingEvents
} = require('../controllers/eventController');

const v_router = express.Router();

v_router.get('/', f_getAllEvents);
v_router.get('/search', f_searchEvents);
v_router.get('/upcoming', f_getUpcomingEvents);
v_router.get('/movie/:movieId', f_getEventsByMovie);
v_router.get('/theater/:theaterId', f_getEventsByTheater);
v_router.get('/:id', f_getEventById);
v_router.post('/', f_createEvent);
v_router.put('/:id', f_updateEvent);
v_router.delete('/:id', f_deleteEvent);

module.exports = v_router;
