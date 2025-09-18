const mongoose = require('mongoose');

const c_abTestSchema = new mongoose.Schema({
  test_name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  variants: [{
    name: String,
    algorithm: String,
    weight: {
      type: Number,
      default: 50
    }
  }],
  active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'ab_tests'
});

const c_userTestAssignmentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  test_name: {
    type: String,
    required: true
  },
  variant: {
    type: String,
    required: true
  },
  assigned_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'user_test_assignments'
});

c_userTestAssignmentSchema.index({ user_id: 1, test_name: 1 }, { unique: true });

module.exports = {
  ABTest: mongoose.model('ABTest', c_abTestSchema),
  UserTestAssignment: mongoose.model('UserTestAssignment', c_userTestAssignmentSchema)
};
