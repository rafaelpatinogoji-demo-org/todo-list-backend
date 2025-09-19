const mongoose = require('mongoose');

const c_imdbSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: false
  },
  votes: {
    type: Number,
    required: false
  },
  id: {
    type: Number,
    required: false
  }
}, { _id: false });

const c_movieSchema = new mongoose.Schema({
  plot: {
    type: String,
    required: false
  },
  genres: [{
    type: String
  }],
  runtime: {
    type: Number,
    required: false
  },
  title: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: false
  },
  imdb: c_imdbSchema,
  num_mflix_reviews: {
    type: Number,
    default: 0
  }
}, {
  collection: 'movies'
});

module.exports = mongoose.model('Movie', c_movieSchema);
