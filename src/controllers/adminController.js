const User = require('../models/User');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Session = require('../models/Session');
const Comment = require('../models/Comment');
const AuditLog = require('../models/AuditLog');

const f_getDashboardMetrics = async (p_req, p_res) => {
  try {
    const v_userStats = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const v_totalUsers = await User.countDocuments();
    const v_totalMovies = await Movie.countDocuments();
    const v_totalTheaters = await Theater.countDocuments();
    const v_totalComments = await Comment.countDocuments();
    const v_totalSessions = await Session.countDocuments();

    const v_thirtyDaysAgo = new Date();
    v_thirtyDaysAgo.setDate(v_thirtyDaysAgo.getDate() - 30);

    const v_recentUsers = await User.countDocuments({
      createdAt: { $gte: v_thirtyDaysAgo }
    });

    const v_recentComments = await Comment.countDocuments({
      date: { $gte: v_thirtyDaysAgo }
    });

    const v_topGenres = await Movie.aggregate([
      { $unwind: '$genres' },
      {
        $group: {
          _id: '$genres',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    p_res.json({
      totalUsers: v_totalUsers,
      totalMovies: v_totalMovies,
      totalTheaters: v_totalTheaters,
      totalComments: v_totalComments,
      totalSessions: v_totalSessions,
      userStats: v_userStats,
      recentActivity: {
        newUsers: v_recentUsers,
        newComments: v_recentComments
      },
      topGenres: v_topGenres
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getAuditLogs = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;

    const v_logs = await AuditLog.find()
      .populate('admin_id', 'name email')
      .sort({ timestamp: -1 })
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await AuditLog.countDocuments();

    p_res.json({
      logs: v_logs,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalLogs: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getDashboardMetrics,
  f_getAuditLogs
};
