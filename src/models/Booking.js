const mongoose = require('mongoose');

const c_bookingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  booking_date: {
    type: Date,
    default: Date.now
  },
  show_date: {
    type: Date,
    required: true
  },
  seats: [{
    row: String,
    number: Number
  }],
  total_amount: {
    type: Number,
    required: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  booking_status: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  }
}, {
  collection: 'bookings'
});

c_bookingSchema.index({ booking_date: -1 });
c_bookingSchema.index({ payment_status: 1, booking_date: -1 });
c_bookingSchema.index({ movie_id: 1, booking_date: -1 });

module.exports = mongoose.model('Booking', c_bookingSchema);
