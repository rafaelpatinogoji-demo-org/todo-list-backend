const mongoose = require('mongoose');

const c_theaterSchema = new mongoose.Schema({
  theaterId: {
    type: Number,
    required: true
  },
  location: {
    address: {
      street1: String,
      city: String,
      state: String,
      zipcode: String
    },
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  }
}, {
  collection: 'theaters'
});

module.exports = mongoose.model('Theater', c_theaterSchema);
