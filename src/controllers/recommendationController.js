const EmbeddedMovie = require('../models/EmbeddedMovie');
const UserRating = require('../models/UserRating');
const ViewingHistory = require('../models/ViewingHistory');
const UserPreferences = require('../models/UserPreferences');
const User = require('../models/User');

const f_calculateCosineSimilarity = (vectorA, vectorB) => {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const f_getPersonalizedRecommendations = async (p_req, p_res) => {
  try {
    const { userId } = p_req.params;
    const v_limit = parseInt(p_req.query.limit) || 10;
    
    const v_userRatings = await UserRating.find({ user_id: userId })
      .populate('movie_id');
    
    if (v_userRatings.length === 0) {
      return f_getColdStartRecommendations(userId, v_limit, p_res);
    }
    
    const v_likedMovies = v_userRatings
      .filter(rating => rating.rating >= 4)
      .map(rating => rating.movie_id);
    
    const v_recommendations = await f_getContentBasedRecommendations(
      v_likedMovies, userId, v_limit
    );
    
    p_res.json({
      recommendations: v_recommendations,
      algorithm: 'personalized_content_based',
      user_id: userId
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getContentBasedRecommendations = async (likedMovies, userId, limit) => {
  const v_candidateMovies = await EmbeddedMovie.find({
    _id: { $nin: likedMovies.map(m => m._id) },
    plot_embedding_voyage_3_large: { $exists: true, $ne: null }
  });
  
  const v_similarities = [];
  
  for (const candidate of v_candidateMovies) {
    let totalSimilarity = 0;
    let count = 0;
    
    for (const likedMovie of likedMovies) {
      if (likedMovie.plot_embedding_voyage_3_large) {
        const similarity = f_calculateCosineSimilarity(
          candidate.plot_embedding_voyage_3_large,
          likedMovie.plot_embedding_voyage_3_large
        );
        totalSimilarity += similarity;
        count++;
      }
    }
    
    if (count > 0) {
      v_similarities.push({
        movie: candidate,
        similarity: totalSimilarity / count
      });
    }
  }
  
  return v_similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(item => ({
      ...item.movie.toObject(),
      similarity_score: item.similarity
    }));
};

const f_getColdStartRecommendations = async (userId, limit, res) => {
  try {
    const v_userPrefs = await UserPreferences.findOne({ user_id: userId });
    
    let v_filter = {};
    if (v_userPrefs && v_userPrefs.preferred_genres.length > 0) {
      v_filter.genres = { $in: v_userPrefs.preferred_genres };
    }
    
    const v_popularMovies = await EmbeddedMovie.find({
      ...v_filter,
      'imdb.rating': { $gte: 7.0 },
      'imdb.votes': { $gte: 10000 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .limit(limit);
    
    res.json({
      recommendations: v_popularMovies,
      algorithm: 'cold_start_popular',
      user_id: userId
    });
  } catch (error) {
    throw error;
  }
};

const f_getGenreRecommendations = async (p_req, p_res) => {
  try {
    const { genre } = p_req.params;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const { userId } = p_req.query;
    
    let v_excludeFilter = {};
    if (userId) {
      const v_userRatings = await UserRating.find({ user_id: userId });
      const v_ratedMovieIds = v_userRatings.map(r => r.movie_id);
      v_excludeFilter._id = { $nin: v_ratedMovieIds };
    }
    
    const v_genreMovies = await EmbeddedMovie.find({
      genres: { $in: [genre] },
      'imdb.rating': { $gte: 6.0 },
      ...v_excludeFilter
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .limit(v_limit);
    
    p_res.json({
      recommendations: v_genreMovies,
      algorithm: 'genre_based',
      genre: genre
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSimilarMovies = async (p_req, p_res) => {
  try {
    const { movieId } = p_req.params;
    const v_limit = parseInt(p_req.query.limit) || 10;
    
    const v_targetMovie = await EmbeddedMovie.findById(movieId);
    if (!v_targetMovie || !v_targetMovie.plot_embedding_voyage_3_large) {
      return p_res.status(404).json({ message: 'Movie not found or no embedding available' });
    }
    
    const v_candidateMovies = await EmbeddedMovie.find({
      _id: { $ne: movieId },
      plot_embedding_voyage_3_large: { $exists: true, $ne: null }
    });
    
    const v_similarities = v_candidateMovies.map(movie => ({
      movie,
      similarity: f_calculateCosineSimilarity(
        v_targetMovie.plot_embedding_voyage_3_large,
        movie.plot_embedding_voyage_3_large
      )
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, v_limit);
    
    p_res.json({
      similar_movies: v_similarities.map(item => ({
        ...item.movie.toObject(),
        similarity_score: item.similarity
      })),
      target_movie: v_targetMovie.title
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTrendingMovies = async (p_req, p_res) => {
  try {
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_daysBack = parseInt(p_req.query.days) || 30;
    
    const v_cutoffDate = new Date();
    v_cutoffDate.setDate(v_cutoffDate.getDate() - v_daysBack);
    
    const v_recentViews = await ViewingHistory.aggregate([
      { $match: { viewed_at: { $gte: v_cutoffDate } } },
      { $group: { 
          _id: '$movie_id', 
          view_count: { $sum: 1 },
          recent_views: { $sum: { $cond: [
            { $gte: ['$viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
            1, 0
          ]}}
        }
      },
      { $sort: { recent_views: -1, view_count: -1 } },
      { $limit: v_limit }
    ]);
    
    const v_movieIds = v_recentViews.map(item => item._id);
    const v_movies = await EmbeddedMovie.find({ _id: { $in: v_movieIds } });
    
    const v_trendingMovies = v_recentViews.map(trend => {
      const movie = v_movies.find(m => m._id.toString() === trend._id.toString());
      return {
        ...movie.toObject(),
        trending_score: trend.recent_views * 2 + trend.view_count,
        view_count: trend.view_count,
        recent_views: trend.recent_views
      };
    });
    
    p_res.json({
      trending_movies: v_trendingMovies,
      period_days: v_daysBack
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getCollaborativeRecommendations = async (p_req, p_res) => {
  try {
    const { userId } = p_req.params;
    const v_limit = parseInt(p_req.query.limit) || 10;
    
    const v_userRatings = await UserRating.find({ user_id: userId });
    const v_userMovieIds = v_userRatings.map(r => r.movie_id.toString());
    
    const v_similarUsers = await UserRating.aggregate([
      { $match: { movie_id: { $in: v_userRatings.map(r => r.movie_id) }, user_id: { $ne: userId } } },
      { $group: { 
          _id: '$user_id', 
          common_movies: { $sum: 1 },
          ratings: { $push: { movie_id: '$movie_id', rating: '$rating' } }
        }
      },
      { $match: { common_movies: { $gte: 3 } } },
      { $sort: { common_movies: -1 } },
      { $limit: 50 }
    ]);
    
    const v_recommendations = new Map();
    
    for (const similarUser of v_similarUsers) {
      const v_otherUserRatings = await UserRating.find({ user_id: similarUser._id });
      
      for (const rating of v_otherUserRatings) {
        const movieId = rating.movie_id.toString();
        if (!v_userMovieIds.includes(movieId) && rating.rating >= 4) {
          if (!v_recommendations.has(movieId)) {
            v_recommendations.set(movieId, { score: 0, count: 0 });
          }
          const current = v_recommendations.get(movieId);
          v_recommendations.set(movieId, {
            score: current.score + rating.rating,
            count: current.count + 1
          });
        }
      }
    }
    
    const v_sortedRecs = Array.from(v_recommendations.entries())
      .map(([movieId, data]) => ({
        movieId,
        avgScore: data.score / data.count,
        count: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, v_limit);
    
    const v_movieIds = v_sortedRecs.map(r => r.movieId);
    const v_movies = await EmbeddedMovie.find({ _id: { $in: v_movieIds } });
    
    const v_finalRecommendations = v_sortedRecs.map(rec => {
      const movie = v_movies.find(m => m._id.toString() === rec.movieId);
      return {
        ...movie.toObject(),
        collaborative_score: rec.avgScore,
        recommender_count: rec.count
      };
    });
    
    p_res.json({
      recommendations: v_finalRecommendations,
      algorithm: 'collaborative_filtering',
      user_id: userId
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
  f_getCollaborativeRecommendations
};
