const mongoose = require('mongoose');

const c_userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  collection: 'users'
});

module.exports = mongoose.model('User', c_userSchema);
