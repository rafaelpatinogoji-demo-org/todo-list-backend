const EmbeddedMovie = require('../models/EmbeddedMovie');
const UserRating = require('../models/UserRating');
const ViewingHistory = require('../models/ViewingHistory');
const RecommendationCache = require('../models/RecommendationCache');
const User = require('../models/User');
const {
  f_calculateAverageEmbedding,
  f_findSimilarMoviesByEmbedding,
  f_findSimilarUsers,
  f_aggregateRecommendations,
  f_calculateTrendingScores,
  f_cosineSimilarity
} = require('../utils/recommendationAlgorithms');

const f_getPersonalizedRecommendations = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId || p_req.user?.id;
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User authentication required' });
    }

    const v_cached = await RecommendationCache.findOne({
      user_id: v_userId,
      recommendation_type: 'personalized',
      expires_at: { $gt: new Date() }
    }).populate('recommendations.movie_id');

    if (v_cached) {
      return p_res.json({
        recommendations: v_cached.recommendations,
        cached: true,
        generated_at: v_cached.generated_at
      });
    }

    const v_recommendations = await f_generatePersonalizedRecommendations(v_userId);
    
    await RecommendationCache.create({
      user_id: v_userId,
      recommendation_type: 'personalized',
      recommendations: v_recommendations
    });

    p_res.json({
      recommendations: v_recommendations,
      cached: false,
      generated_at: new Date()
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_generatePersonalizedRecommendations = async (p_userId) => {
  const v_user = await User.findById(p_userId);
  const v_userRatings = await UserRating.find({ user_id: p_userId }).populate('movie_id');
  const v_viewingHistory = await ViewingHistory.find({ user_id: p_userId }).populate('movie_id');

  if (v_userRatings.length === 0 && v_viewingHistory.length === 0) {
    return await f_getColdStartRecommendations(v_user);
  }

  const v_contentBased = await f_getContentBasedRecommendations(p_userId, v_userRatings);
  const v_collaborative = await f_getCollaborativeRecommendations(p_userId);
  
  const v_hybridRecommendations = f_combineRecommendations(v_contentBased, v_collaborative);
  
  return v_hybridRecommendations.slice(0, 20);
};

const f_getColdStartRecommendations = async (p_user) => {
  let v_filter = {
    'imdb.rating': { $gte: 8.0 },
    'imdb.votes': { $gte: 100000 }
  };

  if (p_user?.preferences?.favorite_genres?.length > 0) {
    v_filter.genres = { $in: p_user.preferences.favorite_genres };
  }

  if (p_user?.preferences?.disliked_genres?.length > 0) {
    v_filter.genres = { $nin: p_user.preferences.disliked_genres };
  }

  const v_popularMovies = await EmbeddedMovie.find(v_filter)
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .limit(20);

  return v_popularMovies.map(movie => ({
    movie_id: movie._id,
    movie: movie,
    score: movie.imdb.rating,
    reason: 'Popular movie recommendation'
  }));
};

const f_getContentBasedRecommendations = async (p_userId, p_userRatings) => {
  const v_likedMovies = p_userRatings.filter(rating => rating.rating >= 4);
  
  if (v_likedMovies.length === 0) return [];

  const v_avgEmbedding = f_calculateAverageEmbedding(v_likedMovies.map(r => r.movie_id));
  if (!v_avgEmbedding) return [];
  
  const v_excludeIds = p_userRatings.map(r => r.movie_id._id);
  const v_similarMovies = await f_findSimilarMoviesByEmbedding(v_avgEmbedding, v_excludeIds);
  
  return v_similarMovies.map(movie => ({
    movie_id: movie._id,
    movie: movie,
    score: movie.similarity_score,
    reason: 'Based on your viewing preferences'
  }));
};

const f_getCollaborativeRecommendations = async (p_userId) => {
  const v_userRatings = await UserRating.find({ user_id: p_userId });
  if (v_userRatings.length === 0) return [];
  
  const v_userMovieIds = v_userRatings.map(r => r.movie_id.toString());
  const v_similarUsers = await f_findSimilarUsers(p_userId, v_userRatings);
  
  if (v_similarUsers.length === 0) return [];
  
  const v_recommendations = [];
  for (const v_similarUser of v_similarUsers.slice(0, 10)) {
    const v_theirRatings = await UserRating.find({
      user_id: v_similarUser.user_id,
      rating: { $gte: 4 },
      movie_id: { $nin: v_userMovieIds }
    }).populate('movie_id');
    
    v_theirRatings.forEach(rating => {
      v_recommendations.push({
        movie_id: rating.movie_id,
        score: rating.rating * v_similarUser.similarity,
        reason: 'Users with similar taste also liked this'
      });
    });
  }
  
  return f_aggregateRecommendations(v_recommendations);
};

const f_combineRecommendations = (p_contentBased, p_collaborative) => {
  const v_allRecommendations = [
    ...p_contentBased.map(rec => ({ ...rec, score: rec.score * 0.6 })),
    ...p_collaborative.map(rec => ({ ...rec, score: rec.score * 0.4 }))
  ];
  
  return f_aggregateRecommendations(v_allRecommendations);
};

const f_getGenreRecommendations = async (p_req, p_res) => {
  try {
    const { genre } = p_req.params;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;

    const v_genreMovies = await EmbeddedMovie.find({
      genres: { $in: [genre] },
      'imdb.rating': { $gte: 7.0 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .skip(v_skip)
    .limit(v_limit);

    const v_total = await EmbeddedMovie.countDocuments({
      genres: { $in: [genre] },
      'imdb.rating': { $gte: 7.0 }
    });

    const v_recommendations = v_genreMovies.map(movie => ({
      movie_id: movie._id,
      movie: movie,
      score: movie.imdb.rating,
      reason: `Top-rated ${genre} movie`
    }));

    p_res.json({
      recommendations: v_recommendations,
      genre: genre,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalRecommendations: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSimilarMovies = async (p_req, p_res) => {
  try {
    const { movieId } = p_req.params;
    const v_limit = parseInt(p_req.query.limit) || 20;

    const v_targetMovie = await EmbeddedMovie.findById(movieId);
    if (!v_targetMovie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    if (!v_targetMovie.plot_embedding_voyage_3_large) {
      return p_res.status(400).json({ message: 'Movie does not have plot embedding' });
    }

    const v_similarMovies = await f_findSimilarMoviesByEmbedding(
      v_targetMovie.plot_embedding_voyage_3_large,
      [movieId]
    );

    const v_recommendations = v_similarMovies.slice(0, v_limit).map(movie => ({
      movie_id: movie._id,
      movie: movie,
      score: movie.similarity_score,
      reason: `Similar to "${v_targetMovie.title}"`
    }));

    p_res.json({
      recommendations: v_recommendations,
      target_movie: {
        id: v_targetMovie._id,
        title: v_targetMovie.title
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTrendingMovies = async (p_req, p_res) => {
  try {
    const v_timeWindow = parseInt(p_req.query.days) || 7;
    const v_startDate = new Date(Date.now() - v_timeWindow * 24 * 60 * 60 * 1000);
    
    const v_recentRatings = await UserRating.aggregate([
      { $match: { created_at: { $gte: v_startDate } } },
      { $group: {
        _id: '$movie_id',
        avg_rating: { $avg: '$rating' },
        rating_count: { $sum: 1 }
      }},
      { $match: { avg_rating: { $gte: 3.5 }, rating_count: { $gte: 5 } } }
    ]);
    
    const v_recentViews = await ViewingHistory.aggregate([
      { $match: { viewed_at: { $gte: v_startDate } } },
      { $group: {
        _id: '$movie_id',
        view_count: { $sum: 1 },
        completion_rate: { $avg: { $cond: ['$completed', 1, 0] } }
      }}
    ]);
    
    const v_trendingScores = f_calculateTrendingScores(v_recentRatings, v_recentViews);
    
    const v_movieIds = v_trendingScores.map(item => item._id);
    const v_movies = await EmbeddedMovie.find({ _id: { $in: v_movieIds } });
    
    const v_trendingMovies = v_trendingScores.map(score => {
      const v_movie = v_movies.find(m => m._id.toString() === score._id.toString());
      return {
        movie_id: score._id,
        movie: v_movie,
        trending_score: score.trending_score,
        reason: 'Trending now'
      };
    }).filter(item => item.movie);
    
    p_res.json({
      recommendations: v_trendingMovies.slice(0, 20),
      time_window: v_timeWindow
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getCollaborativeRecommendationsEndpoint = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId || p_req.user?.id;
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User authentication required' });
    }

    const v_cached = await RecommendationCache.findOne({
      user_id: v_userId,
      recommendation_type: 'collaborative',
      expires_at: { $gt: new Date() }
    }).populate('recommendations.movie_id');

    if (v_cached) {
      return p_res.json({
        recommendations: v_cached.recommendations,
        cached: true,
        generated_at: v_cached.generated_at
      });
    }

    const v_recommendations = await f_getCollaborativeRecommendations(v_userId);
    
    await RecommendationCache.create({
      user_id: v_userId,
      recommendation_type: 'collaborative',
      recommendations: v_recommendations
    });

    p_res.json({
      recommendations: v_recommendations,
      cached: false,
      generated_at: new Date()
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_submitRating = async (p_req, p_res) => {
  try {
    const { user_id, movie_id, rating } = p_req.body;
    
    if (!user_id || !movie_id || !rating) {
      return p_res.status(400).json({ message: 'user_id, movie_id, and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return p_res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const v_movie = await EmbeddedMovie.findById(movie_id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    const v_user = await User.findById(user_id);
    if (!v_user) {
      return p_res.status(404).json({ message: 'User not found' });
    }

    const v_existingRating = await UserRating.findOne({ user_id, movie_id });
    
    if (v_existingRating) {
      v_existingRating.rating = rating;
      v_existingRating.created_at = new Date();
      await v_existingRating.save();
    } else {
      await UserRating.create({ user_id, movie_id, rating });
    }

    await RecommendationCache.deleteMany({ user_id });

    p_res.json({ 
      message: 'Rating submitted successfully',
      rating: {
        user_id,
        movie_id,
        rating,
        movie_title: v_movie.title
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_recordViewing = async (p_req, p_res) => {
  try {
    const { user_id, movie_id, watch_duration, completed } = p_req.body;
    
    if (!user_id || !movie_id) {
      return p_res.status(400).json({ message: 'user_id and movie_id are required' });
    }

    const v_movie = await EmbeddedMovie.findById(movie_id);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    const v_user = await User.findById(user_id);
    if (!v_user) {
      return p_res.status(404).json({ message: 'User not found' });
    }

    await ViewingHistory.create({
      user_id,
      movie_id,
      watch_duration: watch_duration || 0,
      completed: completed || false
    });

    p_res.json({ 
      message: 'Viewing recorded successfully',
      viewing: {
        user_id,
        movie_id,
        watch_duration,
        completed,
        movie_title: v_movie.title
      }
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserRatings = async (p_req, p_res) => {
  try {
    const { userId } = p_req.params;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;

    const v_ratings = await UserRating.find({ user_id: userId })
      .populate('movie_id')
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

const f_getViewingHistory = async (p_req, p_res) => {
  try {
    const { userId } = p_req.params;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_skip = (v_page - 1) * v_limit;

    const v_history = await ViewingHistory.find({ user_id: userId })
      .populate('movie_id')
      .sort({ viewed_at: -1 })
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await ViewingHistory.countDocuments({ user_id: userId });

    p_res.json({
      history: v_history,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalHistory: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
  f_getPersonalizedRecommendations,
  f_getGenreRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getCollaborativeRecommendationsEndpoint,
  f_submitRating,
  f_recordViewing,
  f_getUserRatings,
  f_getViewingHistory
};
