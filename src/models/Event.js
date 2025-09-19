const mongoose = require('mongoose');

const c_eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  theater_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true
  },
  event_type: {
    type: String,
    enum: ['premiere', 'festival', 'special_screening', 'regular'],
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  available_tickets: {
    type: Number,
    required: true
  },
  base_price: {
    type: Number,
    required: true,
    min: 0
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC'
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'cancelled', 'completed'],
    default: 'scheduled'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_date: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'events'
});

module.exports = mongoose.model('Event', c_eventSchema);
