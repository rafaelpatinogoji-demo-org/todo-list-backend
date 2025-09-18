const mongoose = require('mongoose');

const c_promotionSchema = new mongoose.Schema({
  campaign_name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  discount_type: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'buy_one_get_one'],
    required: true
  },
  discount_value: {
    type: Number,
    required: true
  },
  applicable_events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  applicable_movies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  usage_limit: {
    type: Number,
    default: null
  },
  usage_count: {
    type: Number,
    default: 0
  },
  promo_code: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active'
  },
  created_date: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'promotions'
});

module.exports = mongoose.model('Promotion', c_promotionSchema);
