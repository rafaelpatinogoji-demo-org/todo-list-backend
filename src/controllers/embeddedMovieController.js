const EmbeddedMovie = require('../models/EmbeddedMovie');

const f_getAllEmbeddedMovies = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_embeddedMovies = await EmbeddedMovie.find()
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await EmbeddedMovie.countDocuments();

    p_res.json({
      embeddedMovies: v_embeddedMovies,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalEmbeddedMovies: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getEmbeddedMovieById = async (p_req, p_res) => {
  try {
    const v_embeddedMovie = await EmbeddedMovie.findById(p_req.params.id);
    if (!v_embeddedMovie) {
      return p_res.status(404).json({ message: 'Embedded movie not found' });
    }
    p_res.json(v_embeddedMovie);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createEmbeddedMovie = async (p_req, p_res) => {
  try {
    const v_embeddedMovie = new EmbeddedMovie(p_req.body);
    const v_savedEmbeddedMovie = await v_embeddedMovie.save();
    p_res.status(201).json(v_savedEmbeddedMovie);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updateEmbeddedMovie = async (p_req, p_res) => {
  try {
    const v_embeddedMovie = await EmbeddedMovie.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    );
    if (!v_embeddedMovie) {
      return p_res.status(404).json({ message: 'Embedded movie not found' });
    }
    p_res.json(v_embeddedMovie);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deleteEmbeddedMovie = async (p_req, p_res) => {
  try {
    const v_embeddedMovie = await EmbeddedMovie.findByIdAndDelete(p_req.params.id);
    if (!v_embeddedMovie) {
      return p_res.status(404).json({ message: 'Embedded movie not found' });
    }
    p_res.json({ message: 'Embedded movie deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchEmbeddedMovies = async (p_req, p_res) => {
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

    const v_embeddedMovies = await EmbeddedMovie.find(v_filter);
    p_res.json(v_embeddedMovies);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllEmbeddedMovies,
  f_getEmbeddedMovieById,
  f_createEmbeddedMovie,
  f_updateEmbeddedMovie,
  f_deleteEmbeddedMovie,
  f_searchEmbeddedMovies
};
