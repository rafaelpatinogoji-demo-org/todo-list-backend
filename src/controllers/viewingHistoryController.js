const ViewingHistory = require('../models/ViewingHistory');
const mongoose = require('mongoose');

const f_recordView = async (p_req, p_res) => {
  try {
    const { user_id, movie_id, watch_duration, completed } = p_req.body;
    
    const v_viewRecord = new ViewingHistory({
      user_id,
      movie_id,
      watch_duration: watch_duration || 0,
      completed: completed || false
    });
    
    const v_savedView = await v_viewRecord.save();
    p_res.status(201).json(v_savedView);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getUserViewingHistory = async (p_req, p_res) => {
  try {
    const { userId } = p_req.params;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;
    
    const v_history = await ViewingHistory.find({ user_id: userId })
      .populate('movie_id', 'title year genres poster')
      .sort({ viewed_at: -1 })
      .skip(v_skip)
      .limit(v_limit);
    
    const v_total = await ViewingHistory.countDocuments({ user_id: userId });
    
    p_res.json({
      viewing_history: v_history,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalViews: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMovieViewStats = async (p_req, p_res) => {
  try {
    const { movieId } = p_req.params;
    
    const v_stats = await ViewingHistory.aggregate([
      { $match: { movie_id: new mongoose.Types.ObjectId(movieId) } },
      { $group: {
          _id: null,
          total_views: { $sum: 1 },
          unique_viewers: { $addToSet: '$user_id' },
          avg_watch_duration: { $avg: '$watch_duration' },
          completion_rate: { $avg: { $cond: ['$completed', 1, 0] } }
        }
      }
    ]);
    
    p_res.json({
      movie_id: movieId,
      stats: v_stats[0] || { total_views: 0, unique_viewers: [], avg_watch_duration: 0, completion_rate: 0 }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_recordView,
  f_getUserViewingHistory,
  f_getMovieViewStats
};
