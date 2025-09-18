const UserRating = require('../models/UserRating');
const EmbeddedMovie = require('../models/EmbeddedMovie');

const f_createOrUpdateRating = async (p_req, p_res) => {
  try {
    const v_userId = p_req.user_id;
    const { movie_id, rating } = p_req.body;

    if (!movie_id || !rating || rating < 1 || rating > 5) {
      return p_res.status(400).json({ 
        message: 'movie_id y rating (1-5) son requeridos' 
      });
    }

    const v_movie = await EmbeddedMovie.findById(movie_id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Película no encontrada' });
    }

    const v_userRating = await UserRating.findOneAndUpdate(
      { user_id: v_userId, movie_id: movie_id },
      { 
        user_id: v_userId, 
        movie_id: movie_id, 
        rating: rating,
        viewed_at: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    p_res.status(201).json({
      message: 'Rating guardado exitosamente',
      userRating: v_userRating
    });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getUserRatings = async (p_req, p_res) => {
  try {
    const v_userId = p_req.user_id;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;

    const v_userRatings = await UserRating.find({ user_id: v_userId })
      .populate('movie_id', 'title genres year imdb.rating poster')
      .sort({ created_at: -1 })
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await UserRating.countDocuments({ user_id: v_userId });

    p_res.json({
      userRatings: v_userRatings,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalRatings: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_deleteRating = async (p_req, p_res) => {
  try {
    const v_userId = p_req.user_id;
    const v_movieId = p_req.params.movieId;

    const v_deletedRating = await UserRating.findOneAndDelete({
      user_id: v_userId,
      movie_id: v_movieId
    });

    if (!v_deletedRating) {
      return p_res.status(404).json({ message: 'Rating no encontrado' });
    }

    p_res.json({ message: 'Rating eliminado exitosamente' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_createOrUpdateRating,
  f_getUserRatings,
  f_deleteRating
};
