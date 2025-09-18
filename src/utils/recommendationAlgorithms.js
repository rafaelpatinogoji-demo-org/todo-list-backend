const EmbeddedMovie = require('../models/EmbeddedMovie');
const UserRating = require('../models/UserRating');
const ViewingHistory = require('../models/ViewingHistory');
const User = require('../models/User');

const f_cosineSimilarity = (p_embedding1, p_embedding2) => {
  if (!p_embedding1 || !p_embedding2 || !Array.isArray(p_embedding1) || !Array.isArray(p_embedding2)) {
    return 0;
  }
  
  if (p_embedding1.length !== p_embedding2.length) {
    return 0;
  }
  
  const v_dotProduct = p_embedding1.reduce((sum, val, idx) => sum + val * p_embedding2[idx], 0);
  const v_magnitude1 = Math.sqrt(p_embedding1.reduce((sum, val) => sum + val * val, 0));
  const v_magnitude2 = Math.sqrt(p_embedding2.reduce((sum, val) => sum + val * val, 0));
  
  if (v_magnitude1 === 0 || v_magnitude2 === 0) {
    return 0;
  }
  
  return v_dotProduct / (v_magnitude1 * v_magnitude2);
};

const f_calculateAverageEmbedding = (p_movies) => {
  if (!p_movies || p_movies.length === 0) return null;
  
  const v_validEmbeddings = p_movies
    .map(movie => movie.plot_embedding_voyage_3_large)
    .filter(embedding => embedding && Array.isArray(embedding));
  
  if (v_validEmbeddings.length === 0) return null;
  
  const v_embeddingLength = v_validEmbeddings[0].length;
  const v_avgEmbedding = new Array(v_embeddingLength).fill(0);
  
  v_validEmbeddings.forEach(embedding => {
    embedding.forEach((val, idx) => {
      v_avgEmbedding[idx] += val;
    });
  });
  
  return v_avgEmbedding.map(val => val / v_validEmbeddings.length);
};

const f_findSimilarMoviesByEmbedding = async (p_targetEmbedding, p_excludeMovieIds = []) => {
  if (!p_targetEmbedding) return [];
  
  const v_movies = await EmbeddedMovie.find({
    _id: { $nin: p_excludeMovieIds },
    plot_embedding_voyage_3_large: { $exists: true, $ne: null }
  }).limit(500);

  const v_similarities = v_movies
    .map(movie => ({
      ...movie.toObject(),
      similarity_score: f_cosineSimilarity(p_targetEmbedding, movie.plot_embedding_voyage_3_large)
    }))
    .filter(movie => movie.similarity_score > 0.1)
    .sort((a, b) => b.similarity_score - a.similarity_score);

  return v_similarities.slice(0, 50);
};

const f_findSimilarUsers = async (p_userId, p_userRatings) => {
  if (p_userRatings.length === 0) return [];
  
  const v_userMovieIds = p_userRatings.map(r => r.movie_id.toString());
  
  const v_otherUserRatings = await UserRating.find({
    user_id: { $ne: p_userId },
    movie_id: { $in: p_userRatings.map(r => r.movie_id) }
  });
  
  const v_userSimilarities = {};
  
  v_otherUserRatings.forEach(rating => {
    const v_otherUserId = rating.user_id.toString();
    if (!v_userSimilarities[v_otherUserId]) {
      v_userSimilarities[v_otherUserId] = {
        user_id: v_otherUserId,
        common_movies: 0,
        similarity_sum: 0
      };
    }
    
    const v_userRating = p_userRatings.find(r => r.movie_id.toString() === rating.movie_id.toString());
    if (v_userRating) {
      v_userSimilarities[v_otherUserId].common_movies++;
      const v_diff = Math.abs(v_userRating.rating - rating.rating);
      v_userSimilarities[v_otherUserId].similarity_sum += (5 - v_diff) / 5;
    }
  });
  
  return Object.values(v_userSimilarities)
    .filter(user => user.common_movies >= 3)
    .map(user => ({
      ...user,
      similarity: user.similarity_sum / user.common_movies
    }))
    .sort((a, b) => b.similarity - a.similarity);
};

const f_aggregateRecommendations = (p_recommendations) => {
  const v_movieScores = {};
  
  p_recommendations.forEach(rec => {
    const v_movieId = rec.movie_id._id ? rec.movie_id._id.toString() : rec.movie_id.toString();
    if (!v_movieScores[v_movieId]) {
      v_movieScores[v_movieId] = {
        movie_id: rec.movie_id,
        scores: [],
        reasons: []
      };
    }
    v_movieScores[v_movieId].scores.push(rec.score);
    v_movieScores[v_movieId].reasons.push(rec.reason);
  });
  
  return Object.values(v_movieScores)
    .map(movie => ({
      movie_id: movie.movie_id,
      score: movie.scores.reduce((sum, score) => sum + score, 0) / movie.scores.length,
      reason: movie.reasons[0]
    }))
    .sort((a, b) => b.score - a.score);
};

const f_calculateTrendingScores = (p_recentRatings, p_recentViews) => {
  const v_movieScores = {};
  
  p_recentRatings.forEach(rating => {
    const v_movieId = rating._id.toString();
    v_movieScores[v_movieId] = {
      _id: rating._id,
      rating_score: rating.avg_rating * Math.log(rating.rating_count + 1),
      view_score: 0
    };
  });
  
  p_recentViews.forEach(view => {
    const v_movieId = view._id.toString();
    if (!v_movieScores[v_movieId]) {
      v_movieScores[v_movieId] = {
        _id: view._id,
        rating_score: 0,
        view_score: 0
      };
    }
    v_movieScores[v_movieId].view_score = view.view_count * view.completion_rate;
  });
  
  return Object.values(v_movieScores)
    .map(movie => ({
      _id: movie._id,
      trending_score: movie.rating_score + movie.view_score
    }))
    .filter(movie => movie.trending_score > 0)
    .sort((a, b) => b.trending_score - a.trending_score);
};

module.exports = {
  f_cosineSimilarity,
  f_calculateAverageEmbedding,
  f_findSimilarMoviesByEmbedding,
  f_findSimilarUsers,
  f_aggregateRecommendations,
  f_calculateTrendingScores
};
