const Movie = require('../models/Movie');

const f_getAllMovies = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_movies = await Movie.find()
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await Movie.countDocuments();

    p_res.json({
      movies: v_movies,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalMovies: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMovieById = async (p_req, p_res) => {
  try {
    const v_movie = await Movie.findById(p_req.params.id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }
    p_res.json(v_movie);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createMovie = async (p_req, p_res) => {
  try {
    const v_movie = new Movie(p_req.body);
    const v_savedMovie = await v_movie.save();
    p_res.status(201).json(v_savedMovie);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateMovie = async (p_req, p_res) => {
  try {
    const v_movie = await Movie.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }
    p_res.json(v_movie);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteMovie = async (p_req, p_res) => {
  try {
    const v_movie = await Movie.findByIdAndDelete(p_req.params.id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }
    p_res.json({ message: 'Movie deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchMovies = async (p_req, p_res) => {
  try {
    const { title, genre, year } = p_req.query;
    const v_filter = {};

    if (title) {
      v_filter.title = { $regex: title, $options: 'i' };
    }
    if (genre) {
      v_filter.genres = { $in: [genre] };
    }
    if (year) {
      v_filter.year = parseInt(year);
    }

    const v_movies = await Movie.find(v_filter);
    p_res.json(v_movies);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllMovies,
  f_getMovieById,
  f_createMovie,
  f_updateMovie,
  f_deleteMovie,
  f_searchMovies
};
