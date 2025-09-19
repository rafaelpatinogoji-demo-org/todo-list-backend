const EmbeddedMovie = require('../models/EmbeddedMovie');
const UserRating = require('../models/UserRating');
const Recommendation = require('../models/Recommendation');
const Comment = require('../models/Comment');

const f_calculateCosineSimilarity = (p_vectorA, p_vectorB) => {
  if (!p_vectorA || !p_vectorB || p_vectorA.length !== p_vectorB.length) {
    return 0;
  }
  
  let v_dotProduct = 0;
  let v_normA = 0;
  let v_normB = 0;
  
  for (let i = 0; i < p_vectorA.length; i++) {
    v_dotProduct += p_vectorA[i] * p_vectorB[i];
    v_normA += p_vectorA[i] * p_vectorA[i];
    v_normB += p_vectorB[i] * p_vectorB[i];
  }
  
  if (v_normA === 0 || v_normB === 0) return 0;
  
  return v_dotProduct / (Math.sqrt(v_normA) * Math.sqrt(v_normB));
};

const f_getPersonalizedRecommendations = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_cachedRecommendations = await Recommendation.find({
      user_id: v_userId,
      algorithm_type: 'hybrid',
      expires_at: { $gt: new Date() }
    })
    .populate('movie_id')
    .sort({ score: -1 })
    .skip(v_skip)
    .limit(v_limit);

    if (v_cachedRecommendations.length > 0) {
      return p_res.json({
        recommendations: v_cachedRecommendations,
        source: 'cached',
        currentPage: v_page,
        totalRecommendations: v_cachedRecommendations.length
      });
    }

    const v_userRatings = await UserRating.find({ user_id: v_userId });
    
    if (v_userRatings.length === 0) {
      return f_getColdStartRecommendations(p_req, p_res);
    }

    const v_collaborativeRecs = await f_getCollaborativeRecommendationsInternal(v_userId, 20);
    
    const v_contentRecs = await f_getContentBasedRecommendationsInternal(v_userId, 15);
    
    const v_genreRecs = await f_getGenreBasedRecommendationsInternal(v_userId, 10);
    
    const v_trendingRecs = await f_getTrendingMoviesInternal(5);

    const v_hybridScores = new Map();
    
    v_collaborativeRecs.forEach(rec => {
      if (rec && rec.movie_id && rec.movie_id._id) {
        const v_movieKey = rec.movie_id._id.toString();
        v_hybridScores.set(v_movieKey, (v_hybridScores.get(v_movieKey) || 0) + rec.score * 0.4);
      }
    });
    
    v_contentRecs.forEach(rec => {
      if (rec && rec.movie_id && rec.movie_id._id) {
        const v_movieKey = rec.movie_id._id.toString();
        v_hybridScores.set(v_movieKey, (v_hybridScores.get(v_movieKey) || 0) + rec.score * 0.3);
      }
    });
    
    v_genreRecs.forEach(rec => {
      if (rec && rec.movie_id && rec.movie_id._id) {
        const v_movieKey = rec.movie_id._id.toString();
        v_hybridScores.set(v_movieKey, (v_hybridScores.get(v_movieKey) || 0) + rec.score * 0.2);
      }
    });
    
    v_trendingRecs.forEach(rec => {
      if (rec && rec.movie_id && rec.movie_id._id) {
        const v_movieKey = rec.movie_id._id.toString();
        v_hybridScores.set(v_movieKey, (v_hybridScores.get(v_movieKey) || 0) + rec.score * 0.1);
      }
    });

    if (v_hybridScores.size === 0) {
      return f_getColdStartRecommendations(p_req, p_res);
    }

    const v_sortedRecommendations = Array.from(v_hybridScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const v_movieIds = v_sortedRecommendations.map(rec => rec[0]);
    const v_movies = await EmbeddedMovie.find({ _id: { $in: v_movieIds } });
    
    const v_recommendations = v_sortedRecommendations.map(rec => {
      const v_movie = v_movies.find(m => m._id.toString() === rec[0]);
      return v_movie ? {
        movie_id: v_movie,
        score: rec[1]
      } : null;
    }).filter(rec => rec !== null);

    const v_expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const v_cachePromises = v_recommendations.slice(0, 30)
      .filter(rec => rec && rec.movie_id && rec.movie_id._id)
      .map(rec => 
        new Recommendation({
          user_id: v_userId,
          movie_id: rec.movie_id._id,
          score: rec.score,
          algorithm_type: 'hybrid',
          expires_at: v_expiresAt
        }).save()
      );
    
    await Promise.all(v_cachePromises);

    const v_paginatedRecs = v_recommendations.slice(v_skip, v_skip + v_limit);

    p_res.json({
      recommendations: v_paginatedRecs,
      source: 'computed',
      currentPage: v_page,
      totalRecommendations: v_recommendations.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getColdStartRecommendations = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_popularMovies = await EmbeddedMovie.find({
      'imdb.rating': { $gte: 7.0 },
      'imdb.votes': { $gte: 10000 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .skip(v_skip)
    .limit(v_limit);

    const v_recommendations = v_popularMovies.map(movie => ({
      movie_id: movie,
      score: movie.imdb && movie.imdb.rating && movie.imdb.votes ? 
        (movie.imdb.rating / 10) * 0.8 + (Math.log(movie.imdb.votes) / 20) * 0.2 : 0.5
    }));

    p_res.json({
      recommendations: v_recommendations,
      source: 'cold_start',
      currentPage: v_page,
      totalRecommendations: v_recommendations.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getGenreBasedRecommendations = async (p_req, p_res) => {
  try {
    const v_genre = p_req.params.genre;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_movies = await EmbeddedMovie.find({
      genres: { $in: [v_genre] },
      'imdb.rating': { $gte: 6.0 }
    })
    .sort({ 'imdb.rating': -1, 'imdb.votes': -1 })
    .skip(v_skip)
    .limit(v_limit);

    const v_recommendations = v_movies.map(movie => ({
      movie_id: movie,
      score: movie.imdb.rating / 10,
      genre: v_genre
    }));

    p_res.json({
      recommendations: v_recommendations,
      genre: v_genre,
      currentPage: v_page,
      totalRecommendations: v_recommendations.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSimilarMovies = async (p_req, p_res) => {
  try {
    const v_movieId = p_req.params.movieId;
    const v_limit = parseInt(p_req.query.limit) || 10;

    const v_baseMovie = await EmbeddedMovie.findById(v_movieId);
    if (!v_baseMovie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    if (!v_baseMovie.plot_embedding_voyage_3_large) {
      return p_res.status(400).json({ message: 'Movie does not have embeddings for similarity calculation' });
    }

    const v_candidateMovies = await EmbeddedMovie.find({
      _id: { $ne: v_movieId },
      genres: { $in: v_baseMovie.genres },
      plot_embedding_voyage_3_large: { $exists: true }
    }).limit(200);

    const v_similarities = v_candidateMovies.map(movie => ({
      movie_id: movie,
      score: f_calculateCosineSimilarity(
        v_baseMovie.plot_embedding_voyage_3_large,
        movie.plot_embedding_voyage_3_large
      )
    }))
    .filter(sim => sim.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, v_limit);

    p_res.json({
      baseMovie: {
        _id: v_baseMovie._id,
        title: v_baseMovie.title,
        genres: v_baseMovie.genres
      },
      similarMovies: v_similarities
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTrendingMovies = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_trendingMovies = await f_getTrendingMoviesInternal(v_limit + v_skip);
    const v_paginatedMovies = v_trendingMovies.slice(v_skip, v_skip + v_limit);

    p_res.json({
      trendingMovies: v_paginatedMovies,
      currentPage: v_page,
      totalMovies: v_trendingMovies.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getTrendingMoviesInternal = async (p_limit = 20) => {
  const v_recentComments = await Comment.aggregate([
    {
      $match: {
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: '$movie_id',
        commentCount: { $sum: 1 },
        lastComment: { $max: '$date' }
      }
    }
  ]);

  const v_activeMovieIds = v_recentComments.map(c => c._id);

  const v_movies = await EmbeddedMovie.find({
    $or: [
      { _id: { $in: v_activeMovieIds } },
      { 'imdb.rating': { $gte: 7.5 }, 'imdb.votes': { $gte: 5000 } }
    ]
  });

  const v_trendingScores = v_movies.map(movie => {
    const v_recentActivity = v_recentComments.find(c => c._id && c._id.toString() === movie._id.toString());
    const v_activityScore = v_recentActivity ? Math.log(v_recentActivity.commentCount + 1) * 0.3 : 0;
    const v_ratingScore = movie.imdb && movie.imdb.rating ? (movie.imdb.rating / 10) * 0.5 : 0;
    const v_popularityScore = movie.imdb && movie.imdb.votes ? Math.log(movie.imdb.votes + 1) / 20 * 0.2 : 0;
    
    return {
      movie_id: movie,
      score: v_activityScore + v_ratingScore + v_popularityScore
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, p_limit);

  return v_trendingScores;
};

const f_getCollaborativeRecommendations = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_recommendations = await f_getCollaborativeRecommendationsInternal(v_userId, v_limit + v_skip);
    const v_paginatedRecs = v_recommendations.slice(v_skip, v_skip + v_limit);

    p_res.json({
      recommendations: v_paginatedRecs,
      currentPage: v_page,
      totalRecommendations: v_recommendations.length
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getCollaborativeRecommendationsInternal = async (p_userId, p_limit = 20) => {
  const v_userRatings = await UserRating.find({ user_id: p_userId });
  if (v_userRatings.length === 0) return [];

  const v_userMovieIds = v_userRatings.map(r => r.movie_id.toString());
  const v_userRatingMap = new Map(v_userRatings.map(r => [r.movie_id.toString(), r.rating]));

  const v_similarUsers = await UserRating.aggregate([
    {
      $match: {
        movie_id: { $in: v_userRatings.map(r => r.movie_id) },
        user_id: { $ne: p_userId }
      }
    },
    {
      $group: {
        _id: '$user_id',
        commonMovies: { $push: { movie_id: '$movie_id', rating: '$rating' } },
        commonCount: { $sum: 1 }
      }
    },
    {
      $match: { commonCount: { $gte: 3 } }
    },
    {
      $sort: { commonCount: -1 }
    },
    {
      $limit: 50
    }
  ]);

  const v_userSimilarities = v_similarUsers.map(user => {
    let v_similarity = 0;
    let v_commonCount = 0;

    user.commonMovies.forEach(movie => {
      const v_userRating = v_userRatingMap.get(movie.movie_id.toString());
      if (v_userRating) {
        v_similarity += Math.abs(v_userRating - movie.rating);
        v_commonCount++;
      }
    });

    return {
      user_id: user._id,
      similarity: v_commonCount > 0 ? 1 - (v_similarity / (v_commonCount * 4)) : 0
    };
  })
  .filter(u => u.similarity > 0.3)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, 10);

  if (v_userSimilarities.length === 0) return [];

  const v_similarUserIds = v_userSimilarities.map(u => u.user_id);
  const v_candidateRatings = await UserRating.find({
    user_id: { $in: v_similarUserIds },
    movie_id: { $nin: v_userMovieIds },
    rating: { $gte: 4 }
  }).populate('movie_id');

  const v_movieScores = new Map();
  v_candidateRatings.forEach(rating => {
    const v_userSim = v_userSimilarities.find(u => u.user_id.toString() === rating.user_id.toString());
    if (v_userSim) {
      const v_movieId = rating.movie_id._id.toString();
      const v_currentScore = v_movieScores.get(v_movieId) || { score: 0, count: 0, movie: rating.movie_id };
      v_currentScore.score += rating.rating * v_userSim.similarity;
      v_currentScore.count += v_userSim.similarity;
      v_movieScores.set(v_movieId, v_currentScore);
    }
  });

  const v_recommendations = Array.from(v_movieScores.values())
    .map(item => ({
      movie_id: item.movie,
      score: item.count > 0 ? item.score / item.count / 5 : 0
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, p_limit);

  return v_recommendations;
};

const f_getContentBasedRecommendationsInternal = async (p_userId, p_limit = 20) => {
  const v_userTopRatings = await UserRating.find({
    user_id: p_userId,
    rating: { $gte: 4 }
  }).populate('movie_id').sort({ rating: -1 }).limit(10);

  if (v_userTopRatings.length === 0) return [];

  const v_likedMovieIds = v_userTopRatings.map(r => r.movie_id._id);
  const v_likedGenres = [...new Set(v_userTopRatings.flatMap(r => r.movie_id.genres))];

  const v_candidateMovies = await EmbeddedMovie.find({
    _id: { $nin: v_likedMovieIds },
    genres: { $in: v_likedGenres },
    'imdb.rating': { $gte: 6.5 }
  }).limit(100);

  const v_recommendations = v_candidateMovies.map(movie => {
    const v_genreOverlap = movie.genres.filter(g => v_likedGenres.includes(g)).length;
    const v_genreScore = v_genreOverlap / Math.max(movie.genres.length, v_likedGenres.length);
    const v_qualityScore = movie.imdb.rating / 10;
    
    return {
      movie_id: movie,
      score: v_genreScore * 0.6 + v_qualityScore * 0.4
    };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, p_limit);

  return v_recommendations;
};

const f_getGenreBasedRecommendationsInternal = async (p_userId, p_limit = 20) => {
  const v_userRatings = await UserRating.find({
    user_id: p_userId,
    rating: { $gte: 4 }
  }).populate('movie_id');

  if (v_userRatings.length === 0) return [];

  const v_genrePreferences = {};
  v_userRatings.forEach(rating => {
    rating.movie_id.genres.forEach(genre => {
      v_genrePreferences[genre] = (v_genrePreferences[genre] || 0) + rating.rating;
    });
  });

  const v_topGenres = Object.entries(v_genrePreferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(g => g[0]);

  const v_ratedMovieIds = v_userRatings.map(r => r.movie_id._id);
  const v_genreMovies = await EmbeddedMovie.find({
    _id: { $nin: v_ratedMovieIds },
    genres: { $in: v_topGenres },
    'imdb.rating': { $gte: 7.0 }
  })
  .sort({ 'imdb.rating': -1 })
  .limit(p_limit);

  return v_genreMovies.map(movie => ({
    movie_id: movie,
    score: movie.imdb.rating / 10
  }));
};

const f_createUserRating = async (p_req, p_res) => {
  try {
    const { user_id, movie_id, rating, interaction_type } = p_req.body;

    if (!user_id || !movie_id || !rating) {
      return p_res.status(400).json({ message: 'user_id, movie_id, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return p_res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const v_existingRating = await UserRating.findOne({ user_id, movie_id });

    if (v_existingRating) {
      v_existingRating.rating = rating;
      v_existingRating.interaction_type = interaction_type || 'rating';
      v_existingRating.timestamp = new Date();
      await v_existingRating.save();
      
      const v_populatedRating = await UserRating.findById(v_existingRating._id)
        .populate('user_id', 'name email')
        .populate('movie_id', 'title year genres');
      
      p_res.json(v_populatedRating);
    } else {
      const v_newRating = new UserRating({
        user_id,
        movie_id,
        rating,
        interaction_type: interaction_type || 'rating'
      });
      
      const v_savedRating = await v_newRating.save();
      const v_populatedRating = await UserRating.findById(v_savedRating._id)
        .populate('user_id', 'name email')
        .populate('movie_id', 'title year genres');
      
      p_res.status(201).json(v_populatedRating);
    }

    await Recommendation.deleteMany({ user_id });
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getUserRatings = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.userId;
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_ratings = await UserRating.find({ user_id: v_userId })
      .populate('movie_id', 'title year genres imdb')
      .sort({ timestamp: -1 })
      .skip(v_skip)
      .limit(v_limit);

    const v_total = await UserRating.countDocuments({ user_id: v_userId });

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

module.exports = {
  f_getPersonalizedRecommendations,
  f_getColdStartRecommendations,
  f_getGenreBasedRecommendations,
  f_getSimilarMovies,
  f_getTrendingMovies,
  f_getCollaborativeRecommendations,
  f_createUserRating,
  f_getUserRatings
};
