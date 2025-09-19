const mongoose = require('mongoose');

const c_promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  discount_type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0
  },
  valid_from: {
    type: Date,
    required: true
  },
  valid_until: {
    type: Date,
    required: true
  },
  usage_limit: {
    type: Number,
    required: false,
    min: 1
  },
  used_count: {
    type: Number,
    default: 0,
    min: 0
  },
  applicable_events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
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
  collection: 'promotions'
});

module.exports = mongoose.model('Promotion', c_promotionSchema);
