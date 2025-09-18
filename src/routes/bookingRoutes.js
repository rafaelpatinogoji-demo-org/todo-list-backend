const express = require('express');
const {
  f_getAllBookings,
  f_getBookingById,
  f_createBooking,
  f_updateBooking,
  f_cancelBooking,
  f_confirmBooking,
  f_getBookingHistory
} = require('../controllers/bookingController');

const v_router = express.Router();

v_router.get('/', f_getAllBookings);
v_router.get('/:id', f_getBookingById);
v_router.get('/user/:userId/history', f_getBookingHistory);
v_router.post('/', f_createBooking);
v_router.put('/:id', f_updateBooking);
v_router.put('/:id/confirm', f_confirmBooking);
v_router.put('/:id/cancel', f_cancelBooking);
v_router.delete('/:id', f_cancelBooking); // Alias para cancelación (important-comment)

module.exports = v_router;
