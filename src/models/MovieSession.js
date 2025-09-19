const mongoose = require('mongoose');

const c_movieSessionSchema = new mongoose.Schema({
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
  showtime: {
    type: Date,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  total_seats: {
    type: Number,
    required: true,
    default: 100
  },
  available_seats: {
    type: Number,
    required: true
  },
  seat_map: [{
    row: String,
    number: Number,
    is_available: {
      type: Boolean,
      default: true
    },
    seat_type: {
      type: String,
      enum: ['standard', 'premium', 'vip'],
      default: 'standard'
    }
  }]
}, {
  collection: 'movie_sessions'
});

module.exports = mongoose.model('MovieSession', c_movieSessionSchema);
