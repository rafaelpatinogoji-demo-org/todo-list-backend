const Movie = require('../models/Movie');
const Comment = require('../models/Comment');

const f_getAllMoviesAdmin = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    const { title, genre, year, search } = p_req.query;

    const v_filter = {};
    if (title) v_filter.title = { $regex: title, $options: 'i' };
    if (genre) v_filter.genres = { $in: [genre] };
    if (year) v_filter.year = parseInt(year);
    if (search) {
      v_filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { plot: { $regex: search, $options: 'i' } }
      ];
    }

    const v_movies = await Movie.find(v_filter)
      .skip(v_skip)
      .limit(v_limit)
      .sort({ year: -1 });

    const v_total = await Movie.countDocuments(v_filter);

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

const f_getMovieWithStats = async (p_req, p_res) => {
  try {
    const v_movie = await Movie.findById(p_req.params.id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Película no encontrada' });
    }

    const v_commentStats = await Comment.aggregate([
      { $match: { movie_id: v_movie._id } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          avgCommentsPerDay: { $avg: 1 }
        }
      }
    ]);

    p_res.json({
      movie: v_movie,
      stats: v_commentStats[0] || { totalComments: 0, avgCommentsPerDay: 0 }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_bulkMovieOperations = async (p_req, p_res) => {
  try {
    const { movieIds, operation, updateData } = p_req.body;

    let v_result;
    switch (operation) {
      case 'update':
        v_result = await Movie.updateMany(
          { _id: { $in: movieIds } },
          updateData
        );
        break;
      case 'delete':
        await Comment.deleteMany({ movie_id: { $in: movieIds } });
        v_result = await Movie.deleteMany({ _id: { $in: movieIds } });
        break;
      default:
        return p_res.status(400).json({ message: 'Operación no válida' });
    }

    p_res.json({
      message: `Operación ${operation} completada`,
      modifiedCount: v_result.modifiedCount || v_result.deletedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportMovies = async (p_req, p_res) => {
  try {
    const v_movies = await Movie.find();
    
    p_res.setHeader('Content-Type', 'application/json');
    p_res.setHeader('Content-Disposition', 'attachment; filename=movies_export.json');
    p_res.json(v_movies);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getAllMoviesAdmin,
  f_getMovieWithStats,
  f_bulkMovieOperations,
  f_exportMovies
};
