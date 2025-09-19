const express = require('express');
const {
  f_getAllTickets,
  f_getTicketById,
  f_purchaseTickets,
  f_cancelTicket,
  f_getTicketsByUser,
  f_getTicketsByEvent,
  f_checkAvailability
} = require('../controllers/ticketController');

const v_router = express.Router();

v_router.get('/', f_getAllTickets);
v_router.get('/user/:userId', f_getTicketsByUser);
v_router.get('/event/:eventId', f_getTicketsByEvent);
v_router.get('/availability/:eventId', f_checkAvailability);
v_router.get('/:id', f_getTicketById);
v_router.post('/purchase', f_purchaseTickets);
v_router.put('/:id/cancel', f_cancelTicket);

module.exports = v_router;
