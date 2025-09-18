const UserRating = require('../models/UserRating');
const mongoose = require('mongoose');

const f_createOrUpdateRating = async (p_req, p_res) => {
  try {
    const { user_id, movie_id, rating } = p_req.body;
    
    const v_existingRating = await UserRating.findOne({ user_id, movie_id });
    
    if (v_existingRating) {
      v_existingRating.rating = rating;
      const v_updatedRating = await v_existingRating.save();
      p_res.json(v_updatedRating);
    } else {
      const v_newRating = new UserRating({ user_id, movie_id, rating });
      const v_savedRating = await v_newRating.save();
      p_res.status(201).json(v_savedRating);
    }
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getUserRatings = async (p_req, p_res) => {
  try {
    const { userId } = p_req.params;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    
    const v_ratings = await UserRating.find({ user_id: userId })
      .populate('movie_id', 'title year genres imdb.rating')
      .sort({ created_at: -1 })
      .skip(v_skip)
      .limit(v_limit);
    
    const v_total = await UserRating.countDocuments({ user_id: userId });
    
    p_res.json({
      ratings: v_ratings,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalRatings: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMovieRatings = async (p_req, p_res) => {
  try {
    const { movieId } = p_req.params;
    
    const v_ratings = await UserRating.find({ movie_id: movieId })
      .populate('user_id', 'name');
    
    const v_avgRating = await UserRating.aggregate([
      { $match: { movie_id: new mongoose.Types.ObjectId(movieId) } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    
    p_res.json({
      ratings: v_ratings,
      average_rating: v_avgRating[0]?.avgRating || 0,
      total_ratings: v_avgRating[0]?.count || 0
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_deleteRating = async (p_req, p_res) => {
  try {
    const { userId, movieId } = p_req.params;
    
    const v_deletedRating = await UserRating.findOneAndDelete({
      user_id: userId,
      movie_id: movieId
    });
    
    if (!v_deletedRating) {
      return p_res.status(404).json({ message: 'Rating not found' });
    }
    
    p_res.json({ message: 'Rating deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_createOrUpdateRating,
  f_getUserRatings,
  f_getMovieRatings,
  f_deleteRating
};
