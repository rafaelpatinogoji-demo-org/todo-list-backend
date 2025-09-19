const mongoose = require('mongoose');

const c_discountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  discount_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  valid_from: {
    type: Date,
    required: true
  },
  valid_until: {
    type: Date,
    required: true
  },
  max_uses: {
    type: Number,
    default: null
  },
  current_uses: {
    type: Number,
    default: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  collection: 'discount_codes'
});

module.exports = mongoose.model('DiscountCode', c_discountCodeSchema);
