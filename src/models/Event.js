const mongoose = require('mongoose');

const c_eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  event_type: {
    type: String,
    enum: ['premiere', 'festival', 'special_screening', 'promotion'],
    required: true
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
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  capacity: {
    type: Number,
    required: true
  },
  available_seats: {
    type: Number,
    required: true
  },
  pricing_tiers: [{
    tier_name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    seats_available: {
      type: Number,
      required: true
    }
  }],
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
  },
  updated_date: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'events'
});

module.exports = mongoose.model('Event', c_eventSchema);
