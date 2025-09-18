const UserEvent = require('../models/UserEvent');
const MovieAnalytics = require('../models/MovieAnalytics');
const Booking = require('../models/Booking');
const SystemMetrics = require('../models/SystemMetrics');
const Dashboard = require('../models/Dashboard');

const f_getUserBehaviorAnalytics = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_userId = p_req.query.user_id;
    const v_eventType = p_req.query.event_type;
    const v_startDate = p_req.query.start_date;
    const v_endDate = p_req.query.end_date;

    const v_filter = {};
    if (v_userId) v_filter.user_id = v_userId;
    if (v_eventType) v_filter.event_type = v_eventType;
    if (v_startDate || v_endDate) {
      v_filter.timestamp = {};
      if (v_startDate) v_filter.timestamp.$gte = new Date(v_startDate);
      if (v_endDate) v_filter.timestamp.$lte = new Date(v_endDate);
    }

    const v_behaviorStats = await UserEvent.aggregate([
      { $match: v_filter },
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 },
          unique_users: { $addToSet: '$user_id' }
        }
      },
      {
        $project: {
          event_type: '$_id',
          count: 1,
          unique_users: { $size: '$unique_users' }
        }
      }
    ]);

    const v_events = await UserEvent.find(v_filter)
      .populate('user_id', 'name email')
      .populate('event_data.movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ timestamp: -1 });

    const v_total = await UserEvent.countDocuments(v_filter);

    p_res.json({
      behavior_stats: v_behaviorStats,
      events: v_events,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalEvents: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getMoviePopularityMetrics = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_sortBy = p_req.query.sort_by || 'trending_score';
    const v_period = p_req.query.period || 'weekly';

    await f_updateTrendingScores();

    const v_sortField = {};
    v_sortField[v_sortBy] = -1;

    const v_popularMovies = await MovieAnalytics.find()
      .populate('movie_id', 'title year genres imdb')
      .skip(v_skip)
      .limit(v_limit)
      .sort(v_sortField);

    const v_popularityStats = await MovieAnalytics.aggregate([
      {
        $group: {
          _id: null,
          total_views: { $sum: '$view_count' },
          avg_trending_score: { $avg: '$trending_score' },
          top_trending_score: { $max: '$trending_score' },
          total_movies: { $sum: 1 }
        }
      }
    ]);

    const v_total = await MovieAnalytics.countDocuments();

    p_res.json({
      popularity_stats: v_popularityStats[0] || {},
      popular_movies: v_popularMovies,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalMovies: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getRevenueAnalytics = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_startDate = p_req.query.start_date;
    const v_endDate = p_req.query.end_date;

    const v_filter = { payment_status: 'completed' };
    if (v_startDate || v_endDate) {
      v_filter.booking_date = {};
      if (v_startDate) v_filter.booking_date.$gte = new Date(v_startDate);
      if (v_endDate) v_filter.booking_date.$lte = new Date(v_endDate);
    }

    const v_revenueStats = await Booking.aggregate([
      { $match: v_filter },
      {
        $group: {
          _id: {
            year: { $year: '$booking_date' },
            month: { $month: '$booking_date' },
            day: { $dayOfMonth: '$booking_date' }
          },
          daily_revenue: { $sum: '$total_amount' },
          daily_bookings: { $sum: 1 },
          avg_booking_value: { $avg: '$total_amount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    const v_movieRevenue = await Booking.aggregate([
      { $match: v_filter },
      {
        $group: {
          _id: '$movie_id',
          total_revenue: { $sum: '$total_amount' },
          total_bookings: { $sum: 1 },
          avg_booking_value: { $avg: '$total_amount' }
        }
      },
      {
        $lookup: {
          from: 'movies',
          localField: '_id',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 }
    ]);

    const v_bookings = await Booking.find(v_filter)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .populate('theater_id', 'theaterId location.address')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ booking_date: -1 });

    const v_total = await Booking.countDocuments(v_filter);

    p_res.json({
      revenue_stats: v_revenueStats,
      movie_revenue: v_movieRevenue,
      bookings: v_bookings,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalBookings: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSystemHealthMetrics = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_hours = parseInt(p_req.query.hours) || 24;

    const v_timeFilter = {
      timestamp: {
        $gte: new Date(Date.now() - v_hours * 60 * 60 * 1000)
      }
    };

    const v_performanceStats = await SystemMetrics.aggregate([
      { $match: v_timeFilter },
      {
        $group: {
          _id: '$endpoint',
          avg_response_time: { $avg: '$response_time' },
          max_response_time: { $max: '$response_time' },
          min_response_time: { $min: '$response_time' },
          total_requests: { $sum: 1 },
          error_count: {
            $sum: {
              $cond: [{ $gte: ['$status_code', 400] }, 1, 0]
            }
          }
        }
      },
      { $sort: { avg_response_time: -1 } }
    ]);

    const v_statusStats = await SystemMetrics.aggregate([
      { $match: v_timeFilter },
      {
        $group: {
          _id: '$status_code',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const v_resourceStats = await SystemMetrics.aggregate([
      { $match: v_timeFilter },
      {
        $group: {
          _id: null,
          avg_memory_used: { $avg: '$memory_usage.heapUsed' },
          max_memory_used: { $max: '$memory_usage.heapUsed' },
          avg_cpu_usage: { $avg: '$cpu_usage' },
          max_cpu_usage: { $max: '$cpu_usage' }
        }
      }
    ]);

    const v_recentMetrics = await SystemMetrics.find(v_timeFilter)
      .skip(v_skip)
      .limit(v_limit)
      .sort({ timestamp: -1 });

    const v_total = await SystemMetrics.countDocuments(v_timeFilter);

    p_res.json({
      performance_stats: v_performanceStats,
      status_stats: v_statusStats,
      resource_stats: v_resourceStats[0] || {},
      recent_metrics: v_recentMetrics,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalMetrics: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getDashboardData = async (p_req, p_res) => {
  try {
    const v_role = p_req.params.role;
    const v_userId = p_req.headers['x-user-id'];

    if (!['admin', 'manager', 'user'].includes(v_role)) {
      return p_res.status(400).json({ message: 'Rol de usuario inválido' });
    }

    const v_dashboard = await Dashboard.findOne({
      user_role: v_role,
      is_default: true
    });

    if (!v_dashboard) {
      return p_res.status(404).json({ message: 'Dashboard no encontrado para este rol' });
    }

    const v_dashboardData = {};

    for (const v_widget of v_dashboard.widgets) {
      switch (v_widget.data_source) {
        case 'user_behavior':
          v_dashboardData[v_widget.title] = await f_getUserBehaviorSummary();
          break;
        case 'movie_popularity':
          v_dashboardData[v_widget.title] = await f_getMoviePopularitySummary();
          break;
        case 'revenue':
          v_dashboardData[v_widget.title] = await f_getRevenueSummary();
          break;
        case 'system_health':
          v_dashboardData[v_widget.title] = await f_getSystemHealthSummary();
          break;
      }
    }

    p_res.json({
      dashboard: v_dashboard,
      data: v_dashboardData
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportAnalyticsData = async (p_req, p_res) => {
  try {
    const v_format = p_req.params.format;
    const v_dataType = p_req.query.data_type || 'user_events';
    const v_startDate = p_req.query.start_date;
    const v_endDate = p_req.query.end_date;

    if (!['csv', 'json'].includes(v_format)) {
      return p_res.status(400).json({ message: 'Formato no soportado. Use csv o json' });
    }

    let v_data = [];
    const v_dateFilter = {};
    if (v_startDate || v_endDate) {
      if (v_startDate) v_dateFilter.$gte = new Date(v_startDate);
      if (v_endDate) v_dateFilter.$lte = new Date(v_endDate);
    }

    switch (v_dataType) {
      case 'user_events':
        v_data = await UserEvent.find(
          v_startDate || v_endDate ? { timestamp: v_dateFilter } : {}
        ).populate('user_id', 'name email').lean();
        break;
      case 'movie_analytics':
        v_data = await MovieAnalytics.find().populate('movie_id', 'title year genres').lean();
        break;
      case 'bookings':
        v_data = await Booking.find(
          v_startDate || v_endDate ? { booking_date: v_dateFilter } : {}
        ).populate('user_id movie_id theater_id').lean();
        break;
      case 'system_metrics':
        v_data = await SystemMetrics.find(
          v_startDate || v_endDate ? { timestamp: v_dateFilter } : {}
        ).lean();
        break;
      default:
        return p_res.status(400).json({ message: 'Tipo de datos no válido' });
    }

    if (v_format === 'json') {
      p_res.setHeader('Content-Type', 'application/json');
      p_res.setHeader('Content-Disposition', `attachment; filename="${v_dataType}_export.json"`);
      p_res.json(v_data);
    } else if (v_format === 'csv') {
      if (v_data.length === 0) {
        return p_res.status(404).json({ message: 'No hay datos para exportar' });
      }

      const v_headers = Object.keys(v_data[0]).join(',');
      const v_rows = v_data.map(item => 
        Object.values(item).map(value => 
          typeof value === 'object' ? JSON.stringify(value) : value
        ).join(',')
      );
      
      const v_csv = [v_headers, ...v_rows].join('\n');
      
      p_res.setHeader('Content-Type', 'text/csv');
      p_res.setHeader('Content-Disposition', `attachment; filename="${v_dataType}_export.csv"`);
      p_res.send(v_csv);
    }
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_updateTrendingScores = async () => {
  try {
    const v_sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const v_trendingData = await UserEvent.aggregate([
      {
        $match: {
          event_type: 'movie_view',
          timestamp: { $gte: v_sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: '$event_data.movie_id',
          recent_views: { $sum: 1 }
        }
      }
    ]);

    for (const v_item of v_trendingData) {
      if (v_item._id) {
        await MovieAnalytics.findOneAndUpdate(
          { movie_id: v_item._id },
          {
            $set: {
              weekly_views: v_item.recent_views,
              trending_score: v_item.recent_views * 1.5, // Factor de tendencia
              last_updated: new Date()
            }
          },
          { upsert: true }
        );
      }
    }
  } catch (p_error) {
    console.error('Error actualizando puntuaciones de tendencia:', p_error);
  }
};

const f_getUserBehaviorSummary = async () => {
  return await UserEvent.aggregate([
    {
      $group: {
        _id: '$event_type',
        count: { $sum: 1 }
      }
    }
  ]);
};

const f_getMoviePopularitySummary = async () => {
  return await MovieAnalytics.find()
    .sort({ trending_score: -1 })
    .limit(5)
    .populate('movie_id', 'title');
};

const f_getRevenueSummary = async () => {
  return await Booking.aggregate([
    {
      $match: { payment_status: 'completed' }
    },
    {
      $group: {
        _id: null,
        total_revenue: { $sum: '$total_amount' },
        total_bookings: { $sum: 1 }
      }
    }
  ]);
};

const f_getSystemHealthSummary = async () => {
  const v_oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return await SystemMetrics.aggregate([
    {
      $match: { timestamp: { $gte: v_oneHourAgo } }
    },
    {
      $group: {
        _id: null,
        avg_response_time: { $avg: '$response_time' },
        error_rate: {
          $avg: {
            $cond: [{ $gte: ['$status_code', 400] }, 1, 0]
          }
        }
      }
    }
  ]);
};

module.exports = {
  f_getUserBehaviorAnalytics,
  f_getMoviePopularityMetrics,
  f_getRevenueAnalytics,
  f_getSystemHealthMetrics,
  f_getDashboardData,
  f_exportAnalyticsData
};
