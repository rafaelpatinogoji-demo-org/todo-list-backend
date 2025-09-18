const mongoose = require('mongoose');

const c_selectedSeatSchema = new mongoose.Schema({
  row: { type: String, required: true },
  number: { type: Number, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true }
}, { _id: false });

const c_bookingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movieSession_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MovieSession',
    required: true
  },
  selectedSeats: [c_selectedSeatSchema],
  bookingType: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'expired'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  discountCode: {
    type: String,
    default: null
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'cash', null],
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutos para completar pago (important-comment)
  },
  confirmationCode: {
    type: String,
    unique: true,
    sparse: true
  },
  groupSize: {
    type: Number,
    default: 1
  },
  specialRequests: {
    type: String,
    default: null
  }
}, {
  collection: 'bookings',
  timestamps: true
});

// Índice para expiración automática
c_bookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Booking', c_bookingSchema);
