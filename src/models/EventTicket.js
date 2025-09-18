const mongoose = require('mongoose');

const c_eventTicketSchema = new mongoose.Schema({
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
  ticket_number: {
    type: String,
    unique: true,
    required: true
  },
  pricing_tier: {
    type: String,
    required: true
  },
  price_paid: {
    type: Number,
    required: true
  },
  promotion_applied: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion'
  },
  purchase_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'used'],
    default: 'confirmed'
  }
}, {
  collection: 'event_tickets'
});

module.exports = mongoose.model('EventTicket', c_eventTicketSchema);
