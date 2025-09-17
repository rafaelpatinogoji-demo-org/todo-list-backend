const mongoose = require('mongoose');

const c_sessionSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  jwt: {
    type: String,
    required: true
  }
}, {
  collection: 'sessions'
});

module.exports = mongoose.model('Session', c_sessionSchema);
