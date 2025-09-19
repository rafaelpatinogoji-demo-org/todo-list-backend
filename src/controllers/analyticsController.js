const UserBehavior = require('../models/UserBehavior');
const MovieAnalytics = require('../models/MovieAnalytics');
const SystemMetrics = require('../models/SystemMetrics');
const RevenueAnalytics = require('../models/RevenueAnalytics');
const Movie = require('../models/Movie');
const User = require('../models/User');
const Comment = require('../models/Comment');

const f_getSystemMetrics = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    
    const v_startDate = p_req.query.start_date ? new Date(p_req.query.start_date) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const v_endDate = p_req.query.end_date ? new Date(p_req.query.end_date) : new Date();
    
    const v_metrics = await SystemMetrics.find({
      timestamp: { $gte: v_startDate, $lte: v_endDate }
    })
    .skip(v_skip)
    .limit(v_limit)
    .sort({ timestamp: -1 });
    
    const v_total = await SystemMetrics.countDocuments({
      timestamp: { $gte: v_startDate, $lte: v_endDate }
    });
    
    const v_aggregatedMetrics = await SystemMetrics.aggregate([
      {
        $match: {
          timestamp: { $gte: v_startDate, $lte: v_endDate }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$api_metrics.average_response_time' },
          totalRequests: { $sum: '$api_metrics.total_requests' },
          avgCpuUsage: { $avg: '$system_health.cpu_usage' },
          avgMemoryUsage: { $avg: '$system_health.memory_usage' }
        }
      }
    ]);
    
    p_res.json({
      metrics: v_metrics,
      aggregated: v_aggregatedMetrics[0] || {},
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalRecords: v_total,
      dateRange: { start: v_startDate, end: v_endDate }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserBehaviorAnalytics = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    
    const v_userId = p_req.query.user_id;
    const v_actionType = p_req.query.action_type;
    const v_startDate = p_req.query.start_date ? new Date(p_req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const v_endDate = p_req.query.end_date ? new Date(p_req.query.end_date) : new Date();
    
    const v_filter = {
      timestamp: { $gte: v_startDate, $lte: v_endDate },
      consent_given: true
    };
    
    if (v_userId) v_filter.user_id = v_userId;
    if (v_actionType) v_filter.action_type = v_actionType;
    
    const v_behaviors = await UserBehavior.find(v_filter)
      .populate('user_id', 'name email')
      .populate('movie_id', 'title year')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ timestamp: -1 });
    
    const v_total = await UserBehavior.countDocuments(v_filter);
    
    const v_actionAnalysis = await UserBehavior.aggregate([
      { $match: v_filter },
      {
        $group: {
          _id: '$action_type',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user_id' }
        }
      },
      {
        $project: {
          action_type: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
    
    p_res.json({
      behaviors: v_behaviors,
      actionAnalysis: v_actionAnalysis,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalRecords: v_total
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
    
    const v_sortBy = p_req.query.sort_by || 'popularity_score';
    const v_genre = p_req.query.genre;
    const v_timeframe = p_req.query.timeframe || '30d';
    
    let v_startDate;
    switch (v_timeframe) {
      case '7d':
        v_startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        v_startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        v_startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        v_startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const v_pipeline = [
      {
        $lookup: {
          from: 'movies',
          localField: 'movie_id',
          foreignField: '_id',
          as: 'movie'
        }
      },
      { $unwind: '$movie' }
    ];
    
    if (v_genre) {
      v_pipeline.push({
        $match: { 'movie.genres': v_genre }
      });
    }
    
    v_pipeline.push({
      $addFields: {
        recent_views: {
          $filter: {
            input: '$daily_views',
            cond: { $gte: ['$$this.date', v_startDate] }
          }
        }
      }
    });
    
    v_pipeline.push({
      $addFields: {
        recent_view_count: { $sum: '$recent_views.views' },
        recent_unique_viewers: { $sum: '$recent_views.unique_viewers' }
      }
    });
    
    const v_sortField = {};
    v_sortField[v_sortBy] = -1;
    
    v_pipeline.push(
      { $sort: v_sortField },
      { $skip: v_skip },
      { $limit: v_limit }
    );
    
    const v_movieMetrics = await MovieAnalytics.aggregate(v_pipeline);
    
    const v_countPipeline = [...v_pipeline.slice(0, -2)];
    v_countPipeline.push({ $count: 'total' });
    const v_totalResult = await MovieAnalytics.aggregate(v_countPipeline);
    const v_total = v_totalResult[0]?.total || 0;
    
    const v_topGenres = await MovieAnalytics.aggregate([
      { $unwind: '$genre_performance' },
      {
        $group: {
          _id: '$genre_performance.genre',
          avgScore: { $avg: '$genre_performance.score' },
          movieCount: { $sum: 1 }
        }
      },
      { $sort: { avgScore: -1 } },
      { $limit: 10 }
    ]);
    
    p_res.json({
      movies: v_movieMetrics,
      topGenres: v_topGenres,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalMovies: v_total,
      timeframe: v_timeframe
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTrendingMetrics = async (p_req, p_res) => {
  try {
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_timeframe = p_req.query.timeframe || '7d';
    
    const v_trendingMovies = await MovieAnalytics.find()
      .populate('movie_id', 'title year genres poster')
      .sort({ trending_score: -1 })
      .limit(v_limit);
    
    const v_genreTrends = await MovieAnalytics.aggregate([
      { $unwind: '$genre_performance' },
      {
        $group: {
          _id: '$genre_performance.genre',
          avgTrendingScore: { $avg: '$trending_score' },
          totalMovies: { $sum: 1 },
          avgPopularity: { $avg: '$popularity_score' }
        }
      },
      { $sort: { avgTrendingScore: -1 } },
      { $limit: 10 }
    ]);
    
    const v_viewGrowth = await MovieAnalytics.aggregate([
      {
        $project: {
          movie_id: 1,
          recent_growth: {
            $let: {
              vars: {
                recent_views: {
                  $filter: {
                    input: '$daily_views',
                    cond: { $gte: ['$$this.date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                  }
                },
                previous_views: {
                  $filter: {
                    input: '$daily_views',
                    cond: {
                      $and: [
                        { $gte: ['$$this.date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)] },
                        { $lt: ['$$this.date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] }
                      ]
                    }
                  }
                }
              },
              in: {
                recent_total: { $sum: '$$recent_views.views' },
                previous_total: { $sum: '$$previous_views.views' }
              }
            }
          }
        }
      },
      {
        $addFields: {
          growth_rate: {
            $cond: {
              if: { $gt: ['$recent_growth.previous_total', 0] },
              then: {
                $multiply: [
                  { $divide: [
                    { $subtract: ['$recent_growth.recent_total', '$recent_growth.previous_total'] },
                    '$recent_growth.previous_total'
                  ]},
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { growth_rate: -1 } },
      { $limit: 10 }
    ]);
    
    p_res.json({
      trendingMovies: v_trendingMovies,
      genreTrends: v_genreTrends,
      viewGrowth: v_viewGrowth,
      timeframe: v_timeframe
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
    
    const v_startDate = p_req.query.start_date ? new Date(p_req.query.start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const v_endDate = p_req.query.end_date ? new Date(p_req.query.end_date) : new Date();
    const v_theaterId = p_req.query.theater_id;
    const v_movieId = p_req.query.movie_id;
    
    const v_filter = {
      date: { $gte: v_startDate, $lte: v_endDate }
    };
    
    if (v_theaterId) v_filter.theater_id = v_theaterId;
    if (v_movieId) v_filter.movie_id = v_movieId;
    
    const v_revenueData = await RevenueAnalytics.find(v_filter)
      .populate('theater_id', 'theaterId location.address')
      .populate('movie_id', 'title year genres')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ date: -1 });
    
    const v_total = await RevenueAnalytics.countDocuments(v_filter);
    
    const v_revenueAnalysis = await RevenueAnalytics.aggregate([
      { $match: v_filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue_data.total_revenue' },
          totalBookings: { $sum: '$revenue_data.total_bookings' },
          avgTicketPrice: { $avg: '$revenue_data.average_ticket_price' },
          avgOccupancyRate: { $avg: '$revenue_data.occupancy_rate' },
          totalCancellations: { $sum: '$booking_metrics.cancelled_bookings' },
          totalRefunds: { $sum: '$booking_metrics.refunded_amount' }
        }
      }
    ]);
    
    const v_theaterPerformance = await RevenueAnalytics.aggregate([
      { $match: v_filter },
      {
        $group: {
          _id: '$theater_id',
          totalRevenue: { $sum: '$revenue_data.total_revenue' },
          totalBookings: { $sum: '$revenue_data.total_bookings' },
          avgOccupancyRate: { $avg: '$revenue_data.occupancy_rate' }
        }
      },
      {
        $lookup: {
          from: 'theaters',
          localField: '_id',
          foreignField: '_id',
          as: 'theater'
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
    
    p_res.json({
      revenueData: v_revenueData,
      analysis: v_revenueAnalysis[0] || {},
      theaterPerformance: v_theaterPerformance,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalRecords: v_total,
      dateRange: { start: v_startDate, end: v_endDate }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createCustomDashboard = async (p_req, p_res) => {
  try {
    const { dashboard_name, user_role, widgets, filters } = p_req.body;
    
    const v_allowedRoles = ['admin', 'theater_manager', 'analyst', 'viewer'];
    if (!v_allowedRoles.includes(user_role)) {
      return p_res.status(400).json({ message: 'Rol de usuario no válido' });
    }
    
    const v_roleWidgets = {
      admin: ['system_metrics', 'user_behavior', 'movie_popularity', 'revenue_analytics', 'trending'],
      theater_manager: ['revenue_analytics', 'movie_popularity', 'system_metrics'],
      analyst: ['user_behavior', 'movie_popularity', 'trending', 'system_metrics'],
      viewer: ['movie_popularity', 'trending']
    };
    
    const v_allowedWidgets = widgets.filter(widget => 
      v_roleWidgets[user_role].includes(widget.type)
    );
    
    const v_dashboardConfig = {
      name: dashboard_name,
      user_role: user_role,
      widgets: v_allowedWidgets,
      filters: filters || {},
      created_at: new Date(),
      is_active: true
    };
    
    p_res.status(201).json({
      message: 'Dashboard creado exitosamente',
      dashboard: v_dashboardConfig,
      available_widgets: v_roleWidgets[user_role]
    });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_exportAnalyticsData = async (p_req, p_res) => {
  try {
    const { data_type, format, start_date, end_date, filters } = p_req.query;
    
    const v_startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const v_endDate = end_date ? new Date(end_date) : new Date();
    
    let v_data = [];
    let v_filename = '';
    
    switch (data_type) {
      case 'user_behavior':
        v_data = await UserBehavior.find({
          timestamp: { $gte: v_startDate, $lte: v_endDate },
          consent_given: true
        })
        .populate('user_id', 'name email')
        .populate('movie_id', 'title year')
        .lean();
        v_filename = `user_behavior_${Date.now()}`;
        break;
        
      case 'movie_analytics':
        v_data = await MovieAnalytics.find()
        .populate('movie_id', 'title year genres')
        .lean();
        v_filename = `movie_analytics_${Date.now()}`;
        break;
        
      case 'revenue_analytics':
        v_data = await RevenueAnalytics.find({
          date: { $gte: v_startDate, $lte: v_endDate }
        })
        .populate('theater_id', 'theaterId location')
        .populate('movie_id', 'title year')
        .lean();
        v_filename = `revenue_analytics_${Date.now()}`;
        break;
        
      case 'system_metrics':
        v_data = await SystemMetrics.find({
          timestamp: { $gte: v_startDate, $lte: v_endDate }
        }).lean();
        v_filename = `system_metrics_${Date.now()}`;
        break;
        
      default:
        return p_res.status(400).json({ message: 'Tipo de datos no válido' });
    }
    
    if (format === 'csv') {
      p_res.setHeader('Content-Type', 'text/csv');
      p_res.setHeader('Content-Disposition', `attachment; filename="${v_filename}.csv"`);
      
      if (v_data.length > 0) {
        const v_headers = Object.keys(v_data[0]).join(',');
        const v_rows = v_data.map(row => 
          Object.values(row).map(value => 
            typeof value === 'object' ? JSON.stringify(value) : value
          ).join(',')
        );
        p_res.send([v_headers, ...v_rows].join('\n'));
      } else {
        p_res.send('No data available');
      }
    } else {
      p_res.setHeader('Content-Type', 'application/json');
      p_res.setHeader('Content-Disposition', `attachment; filename="${v_filename}.json"`);
      p_res.json({
        export_info: {
          data_type: data_type,
          date_range: { start: v_startDate, end: v_endDate },
          record_count: v_data.length,
          exported_at: new Date()
        },
        data: v_data
      });
    }
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPerformanceMetrics = async (p_req, p_res) => {
  try {
    const v_timeframe = p_req.query.timeframe || '24h';
    
    let v_startDate;
    switch (v_timeframe) {
      case '1h':
        v_startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        v_startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        v_startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        v_startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    
    const v_currentMetrics = {
      timestamp: new Date(),
      api_metrics: {
        total_requests: Math.floor(Math.random() * 10000),
        successful_requests: Math.floor(Math.random() * 9500),
        failed_requests: Math.floor(Math.random() * 500),
        average_response_time: Math.floor(Math.random() * 200) + 50,
        peak_response_time: Math.floor(Math.random() * 1000) + 200
      },
      database_metrics: {
        connection_count: Math.floor(Math.random() * 50) + 10,
        query_count: Math.floor(Math.random() * 5000),
        average_query_time: Math.floor(Math.random() * 100) + 10,
        slow_queries: Math.floor(Math.random() * 10)
      },
      user_metrics: {
        active_users: Math.floor(Math.random() * 1000) + 100,
        concurrent_sessions: Math.floor(Math.random() * 200) + 50,
        peak_concurrent_users: Math.floor(Math.random() * 500) + 200
      },
      system_health: {
        cpu_usage: Math.floor(Math.random() * 80) + 10,
        memory_usage: Math.floor(Math.random() * 70) + 20,
        disk_usage: Math.floor(Math.random() * 60) + 30,
        uptime_seconds: Math.floor(Math.random() * 86400) + 3600,
        status: 'healthy'
      }
    };
    
    const v_historicalMetrics = await SystemMetrics.find({
      timestamp: { $gte: v_startDate }
    }).sort({ timestamp: -1 }).limit(100);
    
    p_res.json({
      current: v_currentMetrics,
      historical: v_historicalMetrics,
      timeframe: v_timeframe,
      summary: {
        total_records: v_historicalMetrics.length,
        date_range: { start: v_startDate, end: new Date() }
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_updateTrackingConsent = async (p_req, p_res) => {
  try {
    const { user_id, consent_given } = p_req.body;
    
    if (!user_id) {
      return p_res.status(400).json({ message: 'ID de usuario requerido' });
    }
    
    const v_updateResult = await UserBehavior.updateMany(
      { user_id: user_id },
      { consent_given: consent_given }
    );
    
    p_res.json({
      message: 'Consentimiento actualizado exitosamente',
      user_id: user_id,
      consent_given: consent_given,
      records_updated: v_updateResult.modifiedCount
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getSystemMetrics,
  f_getUserBehaviorAnalytics,
  f_getMoviePopularityMetrics,
  f_getTrendingMetrics,
  f_getRevenueAnalytics,
  f_createCustomDashboard,
  f_exportAnalyticsData,
  f_getPerformanceMetrics,
  f_updateTrackingConsent
};
