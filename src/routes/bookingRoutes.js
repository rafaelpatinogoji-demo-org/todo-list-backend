const express = require('express');
const {
  f_getAllBookings,
  f_getBookingById,
  f_createBooking,
  f_confirmBooking,
  f_cancelBooking,
  f_getBookingHistory,
  f_generateTicket,
  f_validateDiscountCode
} = require('../controllers/bookingController');

const v_router = express.Router();

v_router.get('/', f_getAllBookings);
v_router.get('/:id', f_getBookingById);
v_router.post('/', f_createBooking);
v_router.put('/:id/confirm', f_confirmBooking);
v_router.put('/:id/cancel', f_cancelBooking);
v_router.get('/user/:userId/history', f_getBookingHistory);
v_router.get('/:id/ticket', f_generateTicket);
v_router.get('/discount/:code/validate', f_validateDiscountCode);

module.exports = v_router;
