const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  }
}, {
  collection: 'users'
});

// Hash password antes de guardar
c_userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Método para comparar contraseñas
c_userSchema.methods.f_comparePassword = async function(p_candidatePassword) {
  return await bcrypt.compare(p_candidatePassword, this.password);
};

module.exports = mongoose.model('User', c_userSchema);
