const express = require('express');
const {
  f_purchaseTicket,
  f_getUserTickets,
  f_getEventTickets,
  f_cancelTicket,
  f_validateTicket,
  f_getAllTickets
} = require('../controllers/eventTicketController');

const v_router = express.Router();

v_router.get('/', f_getAllTickets);
v_router.get('/user/:userId', f_getUserTickets);
v_router.get('/event/:eventId', f_getEventTickets);
v_router.get('/validate/:ticket_number', f_validateTicket);
v_router.post('/purchase', f_purchaseTicket);
v_router.put('/:id/cancel', f_cancelTicket);

module.exports = v_router;
