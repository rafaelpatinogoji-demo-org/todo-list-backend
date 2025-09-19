const mongoose = require('mongoose');

const c_bookingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movie_session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MovieSession',
    required: true
  },
  seats: [{
    row: String,
    number: Number,
    seat_type: String,
    price: Number
  }],
  total_amount: {
    type: Number,
    required: true
  },
  discount_applied: {
    code: String,
    discount_amount: Number
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  booking_type: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual'
  },
  group_size: {
    type: Number,
    default: 1
  },
  payment_info: {
    payment_method: String,
    transaction_id: String,
    payment_status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  },
  booking_expires_at: {
    type: Date,
    required: true
  },
  confirmation_code: {
    type: String,
    unique: true
  },
  ticket_generated: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'bookings'
});

c_bookingSchema.pre('save', function(next) {
  if (!this.confirmation_code) {
    this.confirmation_code = 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Booking', c_bookingSchema);
