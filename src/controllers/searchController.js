const EmbeddedMovie = require('../models/EmbeddedMovie');
const Movie = require('../models/Movie');
const Comment = require('../models/Comment');
const Theater = require('../models/Theater');
const SearchHistory = require('../models/SearchHistory');
const SearchAnalytics = require('../models/SearchAnalytics');
const searchCache = require('../utils/searchCache');

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
  
  return v_dotProduct / (Math.sqrt(v_normA) * Math.sqrt(v_normB));
};

const f_fullTextSearch = async (p_req, p_res) => {
  try {
    const { query, page = 1, limit = 10, filters = {} } = p_req.body;
    const v_skip = (page - 1) * limit;
    
    const v_cacheKey = searchCache.f_generateKey(query, filters, 'text');
    const v_cachedResult = searchCache.f_get(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }
    
    const v_searchFilter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { plot: { $regex: query, $options: 'i' } },
        { fullplot: { $regex: query, $options: 'i' } },
        { cast: { $in: [new RegExp(query, 'i')] } },
        { directors: { $in: [new RegExp(query, 'i')] } },
        { writers: { $in: [new RegExp(query, 'i')] } }
      ]
    };
    
    if (filters.genres && filters.genres.length > 0) {
      v_searchFilter.genres = { $in: filters.genres };
    }
    if (filters.year) {
      v_searchFilter.year = filters.year;
    }
    if (filters.rating) {
      v_searchFilter['imdb.rating'] = { $gte: filters.rating };
    }
    if (filters.runtime_min) {
      v_searchFilter.runtime = { $gte: filters.runtime_min };
    }
    if (filters.runtime_max) {
      v_searchFilter.runtime = { ...v_searchFilter.runtime, $lte: filters.runtime_max };
    }
    
    const v_results = await EmbeddedMovie.find(v_searchFilter)
      .skip(v_skip)
      .limit(parseInt(limit))
      .sort({ 'imdb.rating': -1 });
    
    const v_total = await EmbeddedMovie.countDocuments(v_searchFilter);
    
    const v_response = {
      results: v_results,
      total: v_total,
      page: parseInt(page),
      totalPages: Math.ceil(v_total / limit),
      searchType: 'text'
    };
    
    searchCache.f_set(v_cacheKey, v_response);
    
    if (p_req.user_id) {
      await f_saveSearchHistory(p_req.user_id, query, filters, v_total, 'text');
    }
    
    await f_updateSearchAnalytics(query, v_total, 'text');
    
    p_res.json(v_response);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_vectorSearch = async (p_req, p_res) => {
  try {
    const { query, page = 1, limit = 10, embedding_type = 'plot_embedding', similarity_threshold = 0.1 } = p_req.body;
    const v_skip = (page - 1) * limit;
    
    const v_cacheKey = searchCache.f_generateKey(query, { embedding_type, similarity_threshold }, 'vector');
    const v_cachedResult = searchCache.f_get(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }
    
    const v_queryEmbedding = await f_generateQueryEmbedding(query);
    
    if (!v_queryEmbedding) {
      return p_res.status(400).json({ message: 'No se pudo generar embedding para la consulta' });
    }
    
    const v_moviesWithEmbeddings = await EmbeddedMovie.find({
      [embedding_type]: { $exists: true, $ne: null }
    });
    
    const v_moviesWithSimilarity = v_moviesWithEmbeddings.map(movie => {
      const v_movieEmbedding = movie[embedding_type];
      const v_similarity = f_calculateCosineSimilarity(v_queryEmbedding, v_movieEmbedding);
      return {
        ...movie.toObject(),
        similarity_score: v_similarity
      };
    }).filter(movie => movie.similarity_score > similarity_threshold)
      .sort((a, b) => b.similarity_score - a.similarity_score);
    
    const v_paginatedResults = v_moviesWithSimilarity.slice(v_skip, v_skip + parseInt(limit));
    
    const v_response = {
      results: v_paginatedResults,
      total: v_moviesWithSimilarity.length,
      page: parseInt(page),
      totalPages: Math.ceil(v_moviesWithSimilarity.length / limit),
      searchType: 'vector'
    };
    
    searchCache.f_set(v_cacheKey, v_response);
    
    if (p_req.user_id) {
      await f_saveSearchHistory(p_req.user_id, query, { embedding_type }, v_moviesWithSimilarity.length, 'vector');
    }
    
    await f_updateSearchAnalytics(query, v_moviesWithSimilarity.length, 'vector');
    
    p_res.json(v_response);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_generateQueryEmbedding = async (p_query) => {
  const v_mockEmbedding = new Array(384).fill(0).map((_, index) => {
    const v_charCode = p_query.charCodeAt(index % p_query.length) || 65;
    return (Math.sin(v_charCode * index * 0.01) + Math.cos(p_query.length * index * 0.001)) * 0.5;
  });
  return v_mockEmbedding;
};

const f_hybridSearch = async (p_req, p_res) => {
  try {
    const { query, page = 1, limit = 10, filters = {}, text_weight = 0.6, vector_weight = 0.4 } = p_req.body;
    
    const v_cacheKey = searchCache.f_generateKey(query, { filters, text_weight, vector_weight }, 'hybrid');
    const v_cachedResult = searchCache.f_get(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }
    
    const v_textResults = await f_performTextSearch(query, filters, 50);
    
    const v_vectorResults = await f_performVectorSearch(query, 50);
    
    const v_combinedResults = f_combineSearchResults(v_textResults, v_vectorResults, text_weight, vector_weight);
    
    const v_skip = (page - 1) * limit;
    const v_paginatedResults = v_combinedResults.slice(v_skip, v_skip + parseInt(limit));
    
    const v_response = {
      results: v_paginatedResults,
      total: v_combinedResults.length,
      page: parseInt(page),
      totalPages: Math.ceil(v_combinedResults.length / limit),
      searchType: 'hybrid'
    };
    
    searchCache.f_set(v_cacheKey, v_response);
    
    if (p_req.user_id) {
      await f_saveSearchHistory(p_req.user_id, query, filters, v_combinedResults.length, 'hybrid');
    }
    
    await f_updateSearchAnalytics(query, v_combinedResults.length, 'hybrid');
    
    p_res.json(v_response);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_performTextSearch = async (p_query, p_filters, p_limit) => {
  const v_searchFilter = {
    $or: [
      { title: { $regex: p_query, $options: 'i' } },
      { plot: { $regex: p_query, $options: 'i' } },
      { fullplot: { $regex: p_query, $options: 'i' } },
      { cast: { $in: [new RegExp(p_query, 'i')] } },
      { directors: { $in: [new RegExp(p_query, 'i')] } }
    ]
  };
  
  if (p_filters.genres && p_filters.genres.length > 0) {
    v_searchFilter.genres = { $in: p_filters.genres };
  }
  if (p_filters.year) {
    v_searchFilter.year = p_filters.year;
  }
  if (p_filters.rating) {
    v_searchFilter['imdb.rating'] = { $gte: p_filters.rating };
  }
  
  return await EmbeddedMovie.find(v_searchFilter)
    .limit(p_limit)
    .sort({ 'imdb.rating': -1 });
};

const f_performVectorSearch = async (p_query, p_limit) => {
  const v_queryEmbedding = await f_generateQueryEmbedding(p_query);
  
  if (!v_queryEmbedding) {
    return [];
  }
  
  const v_moviesWithEmbeddings = await EmbeddedMovie.find({
    plot_embedding: { $exists: true, $ne: null }
  });
  
  return v_moviesWithEmbeddings.map(movie => {
    const v_similarity = f_calculateCosineSimilarity(v_queryEmbedding, movie.plot_embedding);
    return {
      ...movie.toObject(),
      similarity_score: v_similarity
    };
  }).filter(movie => movie.similarity_score > 0.1)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, p_limit);
};

const f_combineSearchResults = (p_textResults, p_vectorResults, p_textWeight, p_vectorWeight) => {
  const v_resultMap = new Map();
  
  p_textResults.forEach((movie, index) => {
    const v_textScore = (p_textResults.length - index) / p_textResults.length;
    v_resultMap.set(movie._id.toString(), {
      ...movie.toObject(),
      text_score: v_textScore,
      vector_score: 0,
      combined_score: v_textScore * p_textWeight
    });
  });
  
  p_vectorResults.forEach(movie => {
    const v_movieId = movie._id.toString();
    if (v_resultMap.has(v_movieId)) {
      const v_existing = v_resultMap.get(v_movieId);
      v_existing.vector_score = movie.similarity_score;
      v_existing.combined_score = (v_existing.text_score * p_textWeight) + (movie.similarity_score * p_vectorWeight);
    } else {
      v_resultMap.set(v_movieId, {
        ...movie,
        text_score: 0,
        vector_score: movie.similarity_score,
        combined_score: movie.similarity_score * p_vectorWeight
      });
    }
  });
  
  return Array.from(v_resultMap.values()).sort((a, b) => b.combined_score - a.combined_score);
};

const f_searchAutocomplete = async (p_req, p_res) => {
  try {
    const { query, limit = 10 } = p_req.query;
    
    if (!query || query.length < 2) {
      return p_res.json({ suggestions: [] });
    }
    
    const v_cacheKey = searchCache.f_generateKey(query, { limit }, 'autocomplete');
    const v_cachedResult = searchCache.f_get(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }
    
    const v_titleSuggestions = await EmbeddedMovie.find({
      title: { $regex: `^${query}`, $options: 'i' }
    }).limit(5).select('title');
    
    const v_castSuggestions = await EmbeddedMovie.find({
      cast: { $in: [new RegExp(`^${query}`, 'i')] }
    }).limit(3).select('cast');
    
    const v_directorSuggestions = await EmbeddedMovie.find({
      directors: { $in: [new RegExp(`^${query}`, 'i')] }
    }).limit(2).select('directors');
    
    const v_suggestions = [];
    
    v_titleSuggestions.forEach(movie => {
      v_suggestions.push({
        text: movie.title,
        type: 'title'
      });
    });
    
    v_castSuggestions.forEach(movie => {
      movie.cast.forEach(actor => {
        if (actor.toLowerCase().startsWith(query.toLowerCase()) && 
            !v_suggestions.find(s => s.text === actor)) {
          v_suggestions.push({
            text: actor,
            type: 'actor'
          });
        }
      });
    });
    
    v_directorSuggestions.forEach(movie => {
      movie.directors.forEach(director => {
        if (director.toLowerCase().startsWith(query.toLowerCase()) && 
            !v_suggestions.find(s => s.text === director)) {
          v_suggestions.push({
            text: director,
            type: 'director'
          });
        }
      });
    });
    
    const v_response = {
      suggestions: v_suggestions.slice(0, parseInt(limit))
    };
    
    searchCache.f_set(v_cacheKey, v_response);
    
    p_res.json(v_response);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_facetedSearch = async (p_req, p_res) => {
  try {
    const { query, filters = {}, page = 1, limit = 10 } = p_req.body;
    const v_skip = (page - 1) * limit;
    
    const v_cacheKey = searchCache.f_generateKey(query, { filters, page, limit }, 'faceted');
    const v_cachedResult = searchCache.f_get(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }
    
    const v_pipeline = [];
    
    if (query) {
      v_pipeline.push({
        $match: {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { plot: { $regex: query, $options: 'i' } },
            { cast: { $in: [new RegExp(query, 'i')] } },
            { directors: { $in: [new RegExp(query, 'i')] } }
          ]
        }
      });
    }
    
    const v_matchStage = {};
    if (filters.genres && filters.genres.length > 0) {
      v_matchStage.genres = { $in: filters.genres };
    }
    if (filters.year_range) {
      v_matchStage.year = { 
        $gte: filters.year_range.min, 
        $lte: filters.year_range.max 
      };
    }
    if (filters.rating_range) {
      v_matchStage['imdb.rating'] = { 
        $gte: filters.rating_range.min, 
        $lte: filters.rating_range.max 
      };
    }
    if (filters.runtime_range) {
      v_matchStage.runtime = { 
        $gte: filters.runtime_range.min, 
        $lte: filters.runtime_range.max 
      };
    }
    
    if (Object.keys(v_matchStage).length > 0) {
      v_pipeline.push({ $match: v_matchStage });
    }
    
    v_pipeline.push({
      $facet: {
        results: [
          { $skip: v_skip },
          { $limit: parseInt(limit) },
          { $sort: { 'imdb.rating': -1 } }
        ],
        total: [{ $count: 'count' }],
        genres: [
          { $unwind: '$genres' },
          { $group: { _id: '$genres', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        years: [
          { $group: { _id: '$year', count: { $sum: 1 } } },
          { $sort: { _id: -1 } }
        ],
        ratings: [
          {
            $bucket: {
              groupBy: '$imdb.rating',
              boundaries: [0, 2, 4, 6, 8, 10],
              default: 'Unknown',
              output: { count: { $sum: 1 } }
            }
          }
        ]
      }
    });
    
    const v_results = await EmbeddedMovie.aggregate(v_pipeline);
    const v_data = v_results[0];
    
    const v_response = {
      results: v_data.results,
      total: v_data.total[0]?.count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((v_data.total[0]?.count || 0) / limit),
      facets: {
        genres: v_data.genres,
        years: v_data.years,
        ratings: v_data.ratings
      }
    };
    
    searchCache.f_set(v_cacheKey, v_response);
    
    if (p_req.user_id) {
      await f_saveSearchHistory(p_req.user_id, query, filters, v_data.total[0]?.count || 0, 'faceted');
    }
    
    p_res.json(v_response);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserSearchHistory = async (p_req, p_res) => {
  try {
    const { page = 1, limit = 20 } = p_req.query;
    const v_skip = (page - 1) * limit;
    
    if (!p_req.user_id) {
      return p_res.status(401).json({ message: 'Usuario no autenticado' });
    }
    
    const v_history = await SearchHistory.find({ user_id: p_req.user_id })
      .sort({ timestamp: -1 })
      .skip(v_skip)
      .limit(parseInt(limit));
    
    const v_total = await SearchHistory.countDocuments({ user_id: p_req.user_id });
    
    p_res.json({
      history: v_history,
      total: v_total,
      page: parseInt(page),
      totalPages: Math.ceil(v_total / limit)
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPopularSearches = async (p_req, p_res) => {
  try {
    const { limit = 10, timeframe = 'week' } = p_req.query;
    
    const v_cacheKey = searchCache.f_generateKey('popular', { limit, timeframe }, 'analytics');
    const v_cachedResult = searchCache.f_get(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }
    
    const v_startDate = new Date();
    switch (timeframe) {
      case 'day':
        v_startDate.setDate(v_startDate.getDate() - 1);
        break;
      case 'week':
        v_startDate.setDate(v_startDate.getDate() - 7);
        break;
      case 'month':
        v_startDate.setMonth(v_startDate.getMonth() - 1);
        break;
      default:
        v_startDate.setDate(v_startDate.getDate() - 7);
    }
    
    const v_popularSearches = await SearchHistory.aggregate([
      {
        $match: {
          timestamp: { $gte: v_startDate }
        }
      },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          avg_results: { $avg: '$results_count' },
          search_types: { $addToSet: '$search_type' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    const v_response = {
      popular_searches: v_popularSearches,
      timeframe: timeframe
    };
    
    searchCache.f_set(v_cacheKey, v_response);
    
    p_res.json(v_response);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_saveSearchHistory = async (p_userId, p_query, p_filters, p_resultsCount, p_searchType) => {
  try {
    const v_searchHistory = new SearchHistory({
      user_id: p_userId,
      query: p_query,
      filters: p_filters,
      results_count: p_resultsCount,
      search_type: p_searchType
    });
    await v_searchHistory.save();
  } catch (p_error) {
    console.error('Error saving search history:', p_error);
  }
};

const f_updateSearchAnalytics = async (p_query, p_resultsCount, p_searchType) => {
  try {
    const v_existingAnalytics = await SearchAnalytics.findOne({ query: p_query });
    
    if (v_existingAnalytics) {
      v_existingAnalytics.search_count += 1;
      v_existingAnalytics.avg_results_count = 
        (v_existingAnalytics.avg_results_count * (v_existingAnalytics.search_count - 1) + p_resultsCount) / 
        v_existingAnalytics.search_count;
      v_existingAnalytics.last_searched = new Date();
      
      if (!v_existingAnalytics.search_types_used.includes(p_searchType)) {
        v_existingAnalytics.search_types_used.push(p_searchType);
      }
      
      await v_existingAnalytics.save();
    } else {
      const v_newAnalytics = new SearchAnalytics({
        query: p_query,
        search_count: 1,
        avg_results_count: p_resultsCount,
        search_types_used: [p_searchType]
      });
      await v_newAnalytics.save();
    }
  } catch (p_error) {
    console.error('Error updating search analytics:', p_error);
  }
};

module.exports = {
  f_fullTextSearch,
  f_vectorSearch,
  f_hybridSearch,
  f_searchAutocomplete,
  f_facetedSearch,
  f_getUserSearchHistory,
  f_getPopularSearches
};
