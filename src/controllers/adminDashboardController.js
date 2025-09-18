const User = require('../models/User');
const Movie = require('../models/Movie');
const Comment = require('../models/Comment');
const Theater = require('../models/Theater');
const Session = require('../models/Session');
const AuditLog = require('../models/AuditLog');

const f_getDashboardMetrics = async (p_req, p_res) => {
  try {
    const v_totalUsers = await User.countDocuments();
    const v_activeUsers = await User.countDocuments({ isActive: true });
    const v_totalMovies = await Movie.countDocuments();
    const v_totalComments = await Comment.countDocuments();
    const v_totalTheaters = await Theater.countDocuments();
    const v_activeSessions = await Session.countDocuments();

    const v_thirtyDaysAgo = new Date();
    v_thirtyDaysAgo.setDate(v_thirtyDaysAgo.getDate() - 30);
    const v_newUsers = await User.countDocuments({ 
      createdAt: { $gte: v_thirtyDaysAgo } 
    });

    const v_sixMonthsAgo = new Date();
    v_sixMonthsAgo.setMonth(v_sixMonthsAgo.getMonth() - 6);
    
    const v_commentsByMonth = await Comment.aggregate([
      { $match: { date: { $gte: v_sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const v_topMovies = await Comment.aggregate([
      {
        $group: {
          _id: '$movie_id',
          commentCount: { $sum: 1 }
        }
      },
      { $sort: { commentCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' }
    ]);

    const v_recentAdminActivity = await AuditLog.find()
      .populate('adminId', 'name email')
      .sort({ timestamp: -1 })
      .limit(10);

    p_res.json({
      metrics: {
        totalUsers: v_totalUsers,
        activeUsers: v_activeUsers,
        totalMovies: v_totalMovies,
        totalComments: v_totalComments,
        totalTheaters: v_totalTheaters,
        activeSessions: v_activeSessions,
        newUsers: v_newUsers
      },
      charts: {
        commentsByMonth: v_commentsByMonth,
        topMovies: v_topMovies
      },
      recentActivity: v_recentAdminActivity
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSystemReports = async (p_req, p_res) => {
  try {
    const { reportType, startDate, endDate } = p_req.query;
    
    const v_dateFilter = {};
    if (startDate) v_dateFilter.$gte = new Date(startDate);
    if (endDate) v_dateFilter.$lte = new Date(endDate);

    let v_report = {};

    switch (reportType) {
      case 'users':
        v_report = await User.aggregate([
          { $match: v_dateFilter.createdAt ? { createdAt: v_dateFilter } : {} },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        break;
      
      case 'comments':
        v_report = await Comment.aggregate([
          { $match: v_dateFilter.date ? { date: v_dateFilter } : {} },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        break;
      
      case 'admin_activity':
        v_report = await AuditLog.aggregate([
          { $match: v_dateFilter.timestamp ? { timestamp: v_dateFilter } : {} },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                action: "$action"
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.date': 1 } }
        ]);
        break;
      
      default:
        return p_res.status(400).json({ message: 'Tipo de reporte no válido' });
    }

    p_res.json({
      reportType,
      dateRange: { startDate, endDate },
      data: v_report
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getDashboardMetrics,
  f_getSystemReports
};
