const mongoose = require('mongoose');

const c_seatSchema = new mongoose.Schema({
  row: { type: String, required: true }, // A, B, C, etc.
  number: { type: Number, required: true }, // 1, 2, 3, etc.
  type: { 
    type: String, 
    enum: ['standard', 'premium', 'vip'], 
    default: 'standard' 
  },
  isAvailable: { type: Boolean, default: true }
}, { _id: false });

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
  pricing: {
    standard: { type: Number, required: true, default: 10.00 },
    premium: { type: Number, required: true, default: 15.00 },
    vip: { type: Number, required: true, default: 20.00 }
  },
  seats: [c_seatSchema],
  totalSeats: { type: Number, required: true },
  availableSeats: { type: Number, required: true }
}, {
  collection: 'movieSessions',
  timestamps: true
});

module.exports = mongoose.model('MovieSession', c_movieSessionSchema);
