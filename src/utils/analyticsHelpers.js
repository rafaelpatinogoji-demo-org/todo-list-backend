const MovieAnalytics = require('../models/MovieAnalytics');
const UserBehavior = require('../models/UserBehavior');

const f_updateMoviePopularity = async (p_movieId) => {
  try {
    const v_viewStats = await UserBehavior.aggregate([
      {
        $match: {
          movie_id: p_movieId,
          action_type: 'view_movie',
          consent_given: true
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          uniqueViewers: { $addToSet: '$user_id' }
        }
      }
    ]);
    
    const v_commentStats = await UserBehavior.aggregate([
      {
        $match: {
          movie_id: p_movieId,
          action_type: 'comment',
          consent_given: true
        }
      },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 }
        }
      }
    ]);
    
    const v_views = v_viewStats[0]?.totalViews || 0;
    const v_uniqueViewers = v_viewStats[0]?.uniqueViewers?.length || 0;
    const v_comments = v_commentStats[0]?.totalComments || 0;
    
    const v_popularityScore = (v_views * 1) + (v_uniqueViewers * 2) + (v_comments * 3);
    
    const v_recentActivity = await UserBehavior.countDocuments({
      movie_id: p_movieId,
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      consent_given: true
    });
    
    const v_trendingScore = v_recentActivity * 5;
    
    await MovieAnalytics.findOneAndUpdate(
      { movie_id: p_movieId },
      {
        $set: {
          view_count: v_views,
          unique_viewers: v_uniqueViewers,
          comment_count: v_comments,
          popularity_score: v_popularityScore,
          trending_score: v_trendingScore,
          last_updated: new Date()
        }
      },
      { upsert: true, new: true }
    );
    
    return {
      movie_id: p_movieId,
      popularity_score: v_popularityScore,
      trending_score: v_trendingScore,
      updated: true
    };
  } catch (p_error) {
    console.error('Error actualizando popularidad de película:', p_error);
    return { movie_id: p_movieId, updated: false, error: p_error.message };
  }
};

const f_generateSampleAnalyticsData = async () => {
  try {
    const Movie = require('../models/Movie');
    const User = require('../models/User');
    
    const v_movies = await Movie.find().limit(10);
    const v_users = await User.find().limit(5);
    
    if (v_movies.length === 0 || v_users.length === 0) {
      console.log('No hay películas o usuarios para generar datos de muestra');
      return;
    }
    
    const v_actionTypes = ['view_movie', 'search', 'comment', 'browse_genre'];
    const v_sampleBehaviors = [];
    
    for (let i = 0; i < 100; i++) {
      const v_randomMovie = v_movies[Math.floor(Math.random() * v_movies.length)];
      const v_randomUser = v_users[Math.floor(Math.random() * v_users.length)];
      const v_randomAction = v_actionTypes[Math.floor(Math.random() * v_actionTypes.length)];
      
      const v_behavior = {
        user_id: v_randomUser._id,
        session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
        action_type: v_randomAction,
        movie_id: v_randomAction === 'view_movie' || v_randomAction === 'comment' ? v_randomMovie._id : undefined,
        metadata: {
          user_agent: 'Mozilla/5.0 (Test Browser)',
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`
        },
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        consent_given: true
      };
      
      v_sampleBehaviors.push(v_behavior);
    }
    
    await UserBehavior.insertMany(v_sampleBehaviors);
    
    for (const v_movie of v_movies) {
      await f_updateMoviePopularity(v_movie._id);
    }
    
    console.log('Datos de muestra de analytics generados exitosamente');
    return { generated: true, behaviors: v_sampleBehaviors.length, movies: v_movies.length };
  } catch (p_error) {
    console.error('Error generando datos de muestra:', p_error);
    return { generated: false, error: p_error.message };
  }
};

const f_cleanupOldAnalyticsData = async (p_retentionDays = 90) => {
  try {
    const v_cutoffDate = new Date(Date.now() - p_retentionDays * 24 * 60 * 60 * 1000);
    
    const v_behaviorCleanup = await UserBehavior.deleteMany({
      timestamp: { $lt: v_cutoffDate }
    });
    
    const SystemMetrics = require('../models/SystemMetrics');
    const v_metricsCleanup = await SystemMetrics.deleteMany({
      timestamp: { $lt: v_cutoffDate }
    });
    
    console.log(`Limpieza completada: ${v_behaviorCleanup.deletedCount} comportamientos, ${v_metricsCleanup.deletedCount} métricas eliminadas`);
    
    return {
      cleaned: true,
      behaviors_deleted: v_behaviorCleanup.deletedCount,
      metrics_deleted: v_metricsCleanup.deletedCount,
      cutoff_date: v_cutoffDate
    };
  } catch (p_error) {
    console.error('Error en limpieza de datos:', p_error);
    return { cleaned: false, error: p_error.message };
  }
};

module.exports = {
  f_updateMoviePopularity,
  f_generateSampleAnalyticsData,
  f_cleanupOldAnalyticsData
};
