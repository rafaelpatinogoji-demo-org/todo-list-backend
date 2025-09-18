const EmbeddedMovie = require('../models/EmbeddedMovie');
const UserRating = require('../models/UserRating');
const User = require('../models/User');
const { f_cosineSimilarity, f_userSimilarity, f_calculateGenreDiversity } = require('../utils/similarityUtils');

const f_getCollaborativeRecommendations = async (p_req, p_res) => {
  try {
    const v_userId = p_req.user_id;
    const v_limit = parseInt(p_req.query.limit) || 10;

    const v_userRatings = await UserRating.find({ user_id: v_userId });
    
    if (v_userRatings.length === 0) {
      return f_getColdStartRecommendations(p_req, p_res);
    }

    const v_allUsers = await UserRating.aggregate([
      { $match: { user_id: { $ne: v_userId } } },
      { $group: { _id: '$user_id', ratings: { $push: '$$ROOT' } } }
    ]);

    const v_similarUsers = v_allUsers
      .map(user => ({
        user_id: user._id,
        similarity: f_userSimilarity(v_userRatings, user.ratings)
      }))
      .filter(user => user.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 50);

    if (v_similarUsers.length === 0) {
      return f_getGenreBasedRecommendations(p_req, p_res);
    }

    const v_similarUserIds = v_similarUsers.map(u => u.user_id);
    const v_recommendedMovies = await UserRating.aggregate([
      { $match: { 
        user_id: { $in: v_similarUserIds },
        rating: { $gte: 4 },
        movie_id: { $nin: v_userRatings.map(r => r.movie_id) }
      }},
      { $group: { 
        _id: '$movie_id', 
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }},
      { $match: { count: { $gte: 2 } } },
      { $sort: { avgRating: -1, count: -1 } },
      { $limit: v_limit },
      { $lookup: { 
        from: 'embedded_movies', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'movie' 
      }},
      { $unwind: '$movie' }
    ]);

    p_res.json({
      recommendations: v_recommendedMovies.map(item => ({
        ...item.movie,
        recommendationScore: item.avgRating,
        recommendationType: 'collaborative'
      })),
      totalRecommendations: v_recommendedMovies.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getGenreBasedRecommendations = async (p_req, p_res) => {
  try {
    const v_userId = p_req.user_id;
    const v_limit = parseInt(p_req.query.limit) || 10;

    const v_userGenrePreferences = await UserRating.aggregate([
      { $match: { user_id: v_userId, rating: { $gte: 4 } } },
      { $lookup: { 
        from: 'embedded_movies', 
        localField: 'movie_id', 
        foreignField: '_id', 
        as: 'movie' 
      }},
      { $unwind: '$movie' },
      { $unwind: '$movie.genres' },
      { $group: { 
        _id: '$movie.genres', 
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }},
      { $sort: { avgRating: -1, count: -1 } },
      { $limit: 5 }
    ]);

    if (v_userGenrePreferences.length === 0) {
      return f_getTrendingMovies(p_req, p_res);
    }

    const v_preferredGenres = v_userGenrePreferences.map(g => g._id);
    
    const v_userMovieIds = await UserRating.find({ user_id: v_userId }).distinct('movie_id');
    
    const v_recommendations = await EmbeddedMovie.find({
      _id: { $nin: v_userMovieIds },
      genres: { $in: v_preferredGenres },
      'imdb.rating': { $gte: 6.5 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .limit(v_limit);

    p_res.json({
      recommendations: v_recommendations.map(movie => ({
        ...movie.toObject(),
        recommendationType: 'genre-based',
        matchedGenres: movie.genres.filter(g => v_preferredGenres.includes(g))
      })),
      totalRecommendations: v_recommendations.length,
      preferredGenres: v_preferredGenres
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSimilarMovies = async (p_req, p_res) => {
  try {
    const v_movieId = p_req.params.movieId;
    const v_limit = parseInt(p_req.query.limit) || 10;

    const v_targetMovie = await EmbeddedMovie.findById(v_movieId);
    if (!v_targetMovie || !v_targetMovie.plot_embedding_voyage_3_large) {
      return p_res.status(404).json({ message: 'Película no encontrada o sin embeddings' });
    }

    const v_allMovies = await EmbeddedMovie.find({
      _id: { $ne: v_movieId },
      plot_embedding_voyage_3_large: { $exists: true, $ne: null }
    }).limit(1000);

    const v_similarities = v_allMovies
      .map(movie => ({
        movie,
        similarity: f_cosineSimilarity(
          v_targetMovie.plot_embedding_voyage_3_large,
          movie.plot_embedding_voyage_3_large
        )
      }))
      .filter(item => item.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, v_limit);

    p_res.json({
      targetMovie: {
        _id: v_targetMovie._id,
        title: v_targetMovie.title,
        genres: v_targetMovie.genres
      },
      similarMovies: v_similarities.map(item => ({
        ...item.movie.toObject(),
        similarityScore: item.similarity,
        recommendationType: 'content-based'
      })),
      totalSimilarMovies: v_similarities.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTrendingMovies = async (p_req, p_res) => {
  try {
    const v_limit = parseInt(p_req.query.limit) || 20;
    const v_daysBack = parseInt(p_req.query.days) || 30;
    const v_cutoffDate = new Date();
    v_cutoffDate.setDate(v_cutoffDate.getDate() - v_daysBack);

    const v_trendingMovies = await UserRating.aggregate([
      { $match: { created_at: { $gte: v_cutoffDate } } },
      { $group: {
        _id: '$movie_id',
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
        recentViews: { $sum: 1 }
      }},
      { $match: { 
        avgRating: { $gte: 3.5 },
        ratingCount: { $gte: 5 }
      }},
      { $addFields: {
        trendingScore: { 
          $multiply: ['$avgRating', { $ln: { $add: ['$recentViews', 1] } }]
        }
      }},
      { $sort: { trendingScore: -1 } },
      { $limit: v_limit },
      { $lookup: {
        from: 'embedded_movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie'
      }},
      { $unwind: '$movie' }
    ]);

    if (v_trendingMovies.length === 0) {
      const v_fallbackMovies = await EmbeddedMovie.find({
        'imdb.rating': { $gte: 6.0 },
        'imdb.votes': { $gte: 1000 }
      })
      .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
      .limit(v_limit);

      return p_res.json({
        trendingMovies: v_fallbackMovies.map(movie => ({
          ...movie.toObject(),
          trendingScore: movie.imdb.rating,
          avgRating: movie.imdb.rating,
          recentViews: 0,
          recommendationType: 'trending-fallback'
        })),
        totalTrendingMovies: v_fallbackMovies.length,
        periodDays: v_daysBack,
        message: 'Usando películas populares como respaldo'
      });
    }

    p_res.json({
      trendingMovies: v_trendingMovies.map(item => ({
        ...item.movie,
        trendingScore: item.trendingScore,
        avgRating: item.avgRating,
        recentViews: item.recentViews,
        recommendationType: 'trending'
      })),
      totalTrendingMovies: v_trendingMovies.length,
      periodDays: v_daysBack
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPersonalizedRecommendations = async (p_req, p_res) => {
  try {
    const v_userId = p_req.user_id;
    const v_limit = parseInt(p_req.query.limit) || 15;

    const v_userRatings = await UserRating.find({ user_id: v_userId });
    
    if (v_userRatings.length === 0) {
      return f_getColdStartRecommendations(p_req, p_res);
    }

    const v_collaborativeData = await f_getCollaborativeRecommendationsData(v_userId, 5);
    const v_genreBasedData = await f_getGenreBasedRecommendationsData(v_userId, 5);
    const v_trendingData = await f_getTrendingMoviesData(5);

    const v_allRecommendations = [
      ...v_collaborativeData.map(r => ({ ...r, weight: 0.4 })),
      ...v_genreBasedData.map(r => ({ ...r, weight: 0.4 })),
      ...v_trendingData.map(r => ({ ...r, weight: 0.2 }))
    ];

    const v_uniqueRecommendations = v_allRecommendations
      .reduce((acc, current) => {
        const existing = acc.find(item => item._id.toString() === current._id.toString());
        if (existing) {
          existing.finalScore += (current.recommendationScore || current.trendingScore || current.imdb?.rating || 5) * current.weight;
          existing.sources.push(current.recommendationType);
        } else {
          acc.push({
            ...current,
            finalScore: (current.recommendationScore || current.trendingScore || current.imdb?.rating || 5) * current.weight,
            sources: [current.recommendationType]
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, v_limit);

    const v_diversifiedRecommendations = f_ensureGenreDiversity(v_uniqueRecommendations);

    p_res.json({
      personalizedRecommendations: v_diversifiedRecommendations,
      totalRecommendations: v_diversifiedRecommendations.length,
      genreDiversity: f_calculateGenreDiversity(v_diversifiedRecommendations),
      recommendationType: 'personalized-hybrid'
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getColdStartRecommendations = async (p_req, p_res) => {
  try {
    const v_limit = parseInt(p_req.query.limit) || 15;

    const v_popularMovies = await EmbeddedMovie.find({
      'imdb.rating': { $gte: 6.0 },
      'imdb.votes': { $gte: 1000 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .limit(v_limit);

    p_res.json({
      recommendations: v_popularMovies.map(movie => ({
        ...movie.toObject(),
        recommendationType: 'cold-start-popular',
        reason: 'Película popular y bien calificada'
      })),
      totalRecommendations: v_popularMovies.length,
      message: 'Recomendaciones basadas en popularidad para usuario nuevo'
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getCollaborativeRecommendationsData = async (p_userId, p_limit) => {
  try {
    const v_userRatings = await UserRating.find({ user_id: p_userId });
    
    if (v_userRatings.length === 0) return [];

    const v_allUsers = await UserRating.aggregate([
      { $match: { user_id: { $ne: p_userId } } },
      { $group: { _id: '$user_id', ratings: { $push: '$$ROOT' } } }
    ]);

    const v_similarUsers = v_allUsers
      .map(user => ({
        user_id: user._id,
        similarity: f_userSimilarity(v_userRatings, user.ratings)
      }))
      .filter(user => user.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20);

    if (v_similarUsers.length === 0) return [];

    const v_similarUserIds = v_similarUsers.map(u => u.user_id);
    const v_recommendedMovies = await UserRating.aggregate([
      { $match: { 
        user_id: { $in: v_similarUserIds },
        rating: { $gte: 4 },
        movie_id: { $nin: v_userRatings.map(r => r.movie_id) }
      }},
      { $group: { 
        _id: '$movie_id', 
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }},
      { $match: { count: { $gte: 1 } } },
      { $sort: { avgRating: -1, count: -1 } },
      { $limit: p_limit },
      { $lookup: { 
        from: 'embedded_movies', 
        localField: '_id', 
        foreignField: '_id', 
        as: 'movie' 
      }},
      { $unwind: '$movie' }
    ]);

    return v_recommendedMovies.map(item => ({
      ...item.movie,
      recommendationScore: item.avgRating,
      recommendationType: 'collaborative'
    }));
  } catch (p_error) {
    return [];
  }
};

const f_getGenreBasedRecommendationsData = async (p_userId, p_limit) => {
  try {
    const v_userGenrePreferences = await UserRating.aggregate([
      { $match: { user_id: p_userId, rating: { $gte: 4 } } },
      { $lookup: { 
        from: 'embedded_movies', 
        localField: 'movie_id', 
        foreignField: '_id', 
        as: 'movie' 
      }},
      { $unwind: '$movie' },
      { $unwind: '$movie.genres' },
      { $group: { 
        _id: '$movie.genres', 
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }},
      { $sort: { avgRating: -1, count: -1 } },
      { $limit: 3 }
    ]);

    if (v_userGenrePreferences.length === 0) return [];

    const v_preferredGenres = v_userGenrePreferences.map(g => g._id);
    const v_userMovieIds = await UserRating.find({ user_id: p_userId }).distinct('movie_id');
    
    const v_recommendations = await EmbeddedMovie.find({
      _id: { $nin: v_userMovieIds },
      genres: { $in: v_preferredGenres },
      'imdb.rating': { $gte: 6.5 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .limit(p_limit);

    return v_recommendations.map(movie => ({
      ...movie.toObject(),
      recommendationType: 'genre-based',
      recommendationScore: movie.imdb.rating
    }));
  } catch (p_error) {
    return [];
  }
};

const f_getTrendingMoviesData = async (p_limit) => {
  try {
    const v_daysBack = 30;
    const v_cutoffDate = new Date();
    v_cutoffDate.setDate(v_cutoffDate.getDate() - v_daysBack);

    const v_trendingMovies = await UserRating.aggregate([
      { $match: { created_at: { $gte: v_cutoffDate } } },
      { $group: {
        _id: '$movie_id',
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }},
      { $match: { 
        avgRating: { $gte: 3.5 },
        ratingCount: { $gte: 2 }
      }},
      { $addFields: {
        trendingScore: { 
          $multiply: ['$avgRating', { $ln: { $add: ['$ratingCount', 1] } }]
        }
      }},
      { $sort: { trendingScore: -1 } },
      { $limit: p_limit },
      { $lookup: {
        from: 'embedded_movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie'
      }},
      { $unwind: '$movie' }
    ]);

    if (v_trendingMovies.length === 0) {
      const v_fallbackMovies = await EmbeddedMovie.find({
        'imdb.rating': { $gte: 6.0 }
      })
      .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
      .limit(p_limit);

      return v_fallbackMovies.map(movie => ({
        ...movie.toObject(),
        trendingScore: movie.imdb.rating,
        recommendationType: 'trending-fallback'
      }));
    }

    return v_trendingMovies.map(item => ({
      ...item.movie,
      trendingScore: item.trendingScore,
      recommendationType: 'trending'
    }));
  } catch (p_error) {
    return [];
  }
};

const f_ensureGenreDiversity = (p_recommendations) => {
  const v_genreCount = {};
  const v_maxPerGenre = 3;
  
  return p_recommendations.filter(movie => {
    const v_primaryGenre = movie.genres?.[0];
    if (!v_primaryGenre) return true;
    
    v_genreCount[v_primaryGenre] = (v_genreCount[v_primaryGenre] || 0) + 1;
    return v_genreCount[v_primaryGenre] <= v_maxPerGenre;
  });
};

module.exports = {
  f_getCollaborativeRecommendations,
  f_getGenreBasedRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getPersonalizedRecommendations,
  f_getColdStartRecommendations
};
