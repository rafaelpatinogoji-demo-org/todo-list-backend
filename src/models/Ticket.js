const mongoose = require('mongoose');

const c_ticketSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  promotion_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion',
    required: false
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  },
  discount_applied: {
    type: Number,
    default: 0,
    min: 0
  },
  purchase_date: {
    type: Date,
    default: Date.now
  },
  ticket_status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'used'],
    default: 'confirmed'
  },
  seat_numbers: [{
    type: String
  }]
}, {
  collection: 'tickets'
});

module.exports = mongoose.model('Ticket', c_ticketSchema);
