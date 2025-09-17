const mongoose = require('mongoose');

const c_embeddedMovieSchema = new mongoose.Schema({
  plot: String,
  genres: [String],
  runtime: Number,
  rated: String,
  cast: [String],
  poster: String,
  title: {
    type: String,
    required: true
  },
  fullplot: String,
  languages: [String],
  released: Date,
  directors: [String],
  writers: [String],
  awards: {
    wins: Number,
    nominations: Number,
    text: String
  },
  lastupdated: String,
  year: Number,
  imdb: {
    rating: Number,
    votes: Number,
    id: Number
  },
  countries: [String],
  type: String,
  tomatoes: {
    viewer: {
      rating: Number,
      numReviews: Number,
      meter: Number
    },
    dvd: Date,
    lastUpdated: Date
  },
  num_mflix_comments: Number,
  plot_embedding: mongoose.Schema.Types.Mixed,
  plot_embedding_voyage_3_large: mongoose.Schema.Types.Mixed
}, {
  collection: 'embedded_movies'
});

module.exports = mongoose.model('EmbeddedMovie', c_embeddedMovieSchema);
