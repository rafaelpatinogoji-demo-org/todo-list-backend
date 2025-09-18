const EmbeddedMovie = require('../models/EmbeddedMovie');
const Movie = require('../models/Movie');
const SearchHistory = require('../models/SearchHistory');
const SearchAnalytics = require('../models/SearchAnalytics');
const { 
  f_calculateCosineSimilarity, 
  f_generateQueryEmbedding,
  f_calculateDotProduct 
} = require('../utils/vectorUtils');
const { 
  f_getCachedResult, 
  f_setCachedResult, 
  f_generateSearchCacheKey 
} = require('../utils/cacheUtils');

const f_fullTextSearch = async (p_req, p_res) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 10,
      sort_by = 'relevance'
    } = p_req.query;

    if (!query) {
      return p_res.status(400).json({ message: 'Query de búsqueda requerido' });
    }

    const v_cacheKey = f_generateSearchCacheKey(query, { page, limit, sort_by }, 'text');
    const v_cachedResult = f_getCachedResult(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }

    const v_skip = (parseInt(page) - 1) * parseInt(limit);
    
    const v_textFilter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { plot: { $regex: query, $options: 'i' } },
        { fullplot: { $regex: query, $options: 'i' } },
        { directors: { $in: [new RegExp(query, 'i')] } },
        { cast: { $in: [new RegExp(query, 'i')] } },
        { genres: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    let v_sort = {};
    switch (sort_by) {
      case 'year':
        v_sort = { year: -1 };
        break;
      case 'rating':
        v_sort = { 'imdb.rating': -1 };
        break;
      case 'title':
        v_sort = { title: 1 };
        break;
      default:
        v_sort = { 'imdb.rating': -1, year: -1 };
    }

    const v_movies = await EmbeddedMovie.find(v_textFilter)
      .sort(v_sort)
      .skip(v_skip)
      .limit(parseInt(limit));

    const v_total = await EmbeddedMovie.countDocuments(v_textFilter);

    const v_result = {
      movies: v_movies,
      currentPage: parseInt(page),
      totalPages: Math.ceil(v_total / parseInt(limit)),
      totalMovies: v_total,
      searchType: 'text',
      query: query
    };

    f_setCachedResult(v_cacheKey, v_result);

    await f_recordSearch(p_req.user_id, query, 'text', {}, v_total);

    p_res.json(v_result);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_vectorSearch = async (p_req, p_res) => {
  try {
    const { 
      query, 
      embedding_type = 'plot_embedding',
      limit = 10,
      min_similarity = 0.1
    } = p_req.query;

    if (!query) {
      return p_res.status(400).json({ message: 'Query de búsqueda requerido' });
    }

    const v_cacheKey = f_generateSearchCacheKey(query, { embedding_type, limit, min_similarity }, 'vector');
    const v_cachedResult = f_getCachedResult(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }

    const v_queryEmbedding = await f_generateQueryEmbedding(query);

    const v_movies = await EmbeddedMovie.find({
      [embedding_type]: { $exists: true, $ne: null }
    });

    const v_scoredMovies = v_movies
      .map(movie => {
        const v_embedding = movie[embedding_type];
        if (!v_embedding || !Array.isArray(v_embedding)) {
          return null;
        }
        
        const v_similarity = f_calculateCosineSimilarity(v_queryEmbedding, v_embedding);
        
        return {
          ...movie.toObject(),
          similarity_score: v_similarity,
          embedding_type: embedding_type
        };
      })
      .filter(movie => movie && movie.similarity_score >= parseFloat(min_similarity))
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, parseInt(limit));

    const v_result = {
      movies: v_scoredMovies,
      totalMovies: v_scoredMovies.length,
      searchType: 'vector',
      query: query,
      embedding_type: embedding_type,
      min_similarity: parseFloat(min_similarity)
    };

    f_setCachedResult(v_cacheKey, v_result);

    await f_recordSearch(p_req.user_id, query, 'vector', { embedding_type }, v_scoredMovies.length);

    p_res.json(v_result);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_hybridSearch = async (p_req, p_res) => {
  try {
    const { 
      query, 
      text_weight = 0.4, 
      vector_weight = 0.6,
      embedding_type = 'plot_embedding',
      limit = 10,
      min_similarity = 0.1
    } = p_req.query;

    if (!query) {
      return p_res.status(400).json({ message: 'Query de búsqueda requerido' });
    }

    const v_cacheKey = f_generateSearchCacheKey(query, { 
      text_weight, vector_weight, embedding_type, limit, min_similarity 
    }, 'hybrid');
    const v_cachedResult = f_getCachedResult(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }

    const v_textFilter = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { plot: { $regex: query, $options: 'i' } },
        { fullplot: { $regex: query, $options: 'i' } },
        { directors: { $in: [new RegExp(query, 'i')] } },
        { cast: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    const v_textMovies = await EmbeddedMovie.find(v_textFilter);
    
    const v_queryEmbedding = await f_generateQueryEmbedding(query);
    
    const v_vectorMovies = await EmbeddedMovie.find({
      [embedding_type]: { $exists: true, $ne: null }
    });

    const v_scoreMap = new Map();

    v_textMovies.forEach(movie => {
      const v_id = movie._id.toString();
      let v_textScore = 0;
      
      const v_queryLower = query.toLowerCase();
      if (movie.title && movie.title.toLowerCase().includes(v_queryLower)) v_textScore += 3;
      if (movie.plot && movie.plot.toLowerCase().includes(v_queryLower)) v_textScore += 2;
      if (movie.directors && movie.directors.some(d => d.toLowerCase().includes(v_queryLower))) v_textScore += 2;
      if (movie.cast && movie.cast.some(c => c.toLowerCase().includes(v_queryLower))) v_textScore += 1;
      
      v_scoreMap.set(v_id, {
        movie: movie,
        text_score: v_textScore,
        vector_score: 0
      });
    });

    v_vectorMovies.forEach(movie => {
      const v_id = movie._id.toString();
      const v_embedding = movie[embedding_type];
      
      if (v_embedding && Array.isArray(v_embedding)) {
        const v_similarity = f_calculateCosineSimilarity(v_queryEmbedding, v_embedding);
        
        if (v_scoreMap.has(v_id)) {
          v_scoreMap.get(v_id).vector_score = v_similarity;
        } else if (v_similarity >= parseFloat(min_similarity)) {
          v_scoreMap.set(v_id, {
            movie: movie,
            text_score: 0,
            vector_score: v_similarity
          });
        }
      }
    });

    const v_hybridResults = Array.from(v_scoreMap.values())
      .map(item => {
        const v_normalizedTextScore = item.text_score / 10; // Normalizar a 0-1
        const v_hybridScore = (v_normalizedTextScore * parseFloat(text_weight)) + 
                             (item.vector_score * parseFloat(vector_weight));
        
        return {
          ...item.movie.toObject(),
          text_score: item.text_score,
          vector_score: item.vector_score,
          hybrid_score: v_hybridScore,
          embedding_type: embedding_type
        };
      })
      .sort((a, b) => b.hybrid_score - a.hybrid_score)
      .slice(0, parseInt(limit));

    const v_result = {
      movies: v_hybridResults,
      totalMovies: v_hybridResults.length,
      searchType: 'hybrid',
      query: query,
      weights: {
        text: parseFloat(text_weight),
        vector: parseFloat(vector_weight)
      },
      embedding_type: embedding_type
    };

    f_setCachedResult(v_cacheKey, v_result);

    await f_recordSearch(p_req.user_id, query, 'hybrid', { 
      text_weight, vector_weight, embedding_type 
    }, v_hybridResults.length);

    p_res.json(v_result);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_facetedSearch = async (p_req, p_res) => {
  try {
    const { 
      query,
      genre,
      year_min,
      year_max,
      rating_min,
      rating_max,
      runtime_min,
      runtime_max,
      directors,
      cast,
      countries,
      page = 1,
      limit = 10,
      sort_by = 'relevance'
    } = p_req.query;

    const v_filter = {};
    
    if (query) {
      v_filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { plot: { $regex: query, $options: 'i' } },
        { fullplot: { $regex: query, $options: 'i' } }
      ];
    }

    if (genre) {
      v_filter.genres = { $in: Array.isArray(genre) ? genre : [genre] };
    }

    if (year_min || year_max) {
      v_filter.year = {};
      if (year_min) v_filter.year.$gte = parseInt(year_min);
      if (year_max) v_filter.year.$lte = parseInt(year_max);
    }

    if (rating_min || rating_max) {
      v_filter['imdb.rating'] = {};
      if (rating_min) v_filter['imdb.rating'].$gte = parseFloat(rating_min);
      if (rating_max) v_filter['imdb.rating'].$lte = parseFloat(rating_max);
    }

    if (runtime_min || runtime_max) {
      v_filter.runtime = {};
      if (runtime_min) v_filter.runtime.$gte = parseInt(runtime_min);
      if (runtime_max) v_filter.runtime.$lte = parseInt(runtime_max);
    }

    if (directors) {
      const v_directorArray = Array.isArray(directors) ? directors : [directors];
      v_filter.directors = { $in: v_directorArray.map(d => new RegExp(d, 'i')) };
    }

    if (cast) {
      const v_castArray = Array.isArray(cast) ? cast : [cast];
      v_filter.cast = { $in: v_castArray.map(c => new RegExp(c, 'i')) };
    }

    if (countries) {
      const v_countryArray = Array.isArray(countries) ? countries : [countries];
      v_filter.countries = { $in: v_countryArray };
    }

    const v_cacheKey = f_generateSearchCacheKey(query || 'faceted', v_filter, 'faceted');
    const v_cachedResult = f_getCachedResult(v_cacheKey);
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }

    const v_skip = (parseInt(page) - 1) * parseInt(limit);

    let v_sort = {};
    switch (sort_by) {
      case 'year':
        v_sort = { year: -1 };
        break;
      case 'rating':
        v_sort = { 'imdb.rating': -1 };
        break;
      case 'title':
        v_sort = { title: 1 };
        break;
      case 'runtime':
        v_sort = { runtime: -1 };
        break;
      default:
        v_sort = { 'imdb.rating': -1, year: -1 };
    }

    const v_movies = await EmbeddedMovie.find(v_filter)
      .sort(v_sort)
      .skip(v_skip)
      .limit(parseInt(limit));

    const v_total = await EmbeddedMovie.countDocuments(v_filter);

    const v_facets = await f_getFacets(v_filter);

    const v_result = {
      movies: v_movies,
      currentPage: parseInt(page),
      totalPages: Math.ceil(v_total / parseInt(limit)),
      totalMovies: v_total,
      searchType: 'faceted',
      query: query,
      filters: {
        genre, year_min, year_max, rating_min, rating_max,
        runtime_min, runtime_max, directors, cast, countries
      },
      facets: v_facets
    };

    f_setCachedResult(v_cacheKey, v_result);

    await f_recordSearch(p_req.user_id, query || 'faceted_search', 'faceted', v_filter, v_total);

    p_res.json(v_result);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_autocomplete = async (p_req, p_res) => {
  try {
    const { query, type = 'all', limit = 10 } = p_req.query;

    if (!query || query.length < 2) {
      return p_res.status(400).json({ message: 'Query debe tener al menos 2 caracteres' });
    }

    const v_cacheKey = `autocomplete:${type}:${query}:${limit}`;
    const v_cachedResult = f_getCachedResult(v_cacheKey, 'autocomplete');
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }

    const v_suggestions = {};

    if (type === 'all' || type === 'titles') {
      v_suggestions.titles = await f_getTitleSuggestions(query, limit);
    }

    if (type === 'all' || type === 'directors') {
      v_suggestions.directors = await f_getDirectorSuggestions(query, limit);
    }

    if (type === 'all' || type === 'actors') {
      v_suggestions.actors = await f_getActorSuggestions(query, limit);
    }

    if (type === 'all' || type === 'genres') {
      v_suggestions.genres = await f_getGenreSuggestions(query, limit);
    }

    const v_result = {
      query: query,
      suggestions: v_suggestions,
      type: type
    };

    f_setCachedResult(v_cacheKey, v_result, 'autocomplete');

    p_res.json(v_result);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchHistory = async (p_req, p_res) => {
  try {
    const { page = 1, limit = 20 } = p_req.query;
    const v_userId = p_req.user_id;

    if (!v_userId) {
      return p_res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const v_skip = (parseInt(page) - 1) * parseInt(limit);

    const v_history = await SearchHistory.find({ user_id: v_userId })
      .sort({ timestamp: -1 })
      .skip(v_skip)
      .limit(parseInt(limit));

    const v_total = await SearchHistory.countDocuments({ user_id: v_userId });

    p_res.json({
      history: v_history,
      currentPage: parseInt(page),
      totalPages: Math.ceil(v_total / parseInt(limit)),
      totalSearches: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_popularSearches = async (p_req, p_res) => {
  try {
    const { limit = 10, period = 'all' } = p_req.query;

    const v_cacheKey = `popular:${period}:${limit}`;
    const v_cachedResult = f_getCachedResult(v_cacheKey, 'analytics');
    if (v_cachedResult) {
      return p_res.json(v_cachedResult);
    }

    let v_dateFilter = {};
    if (period === 'week') {
      const v_weekAgo = new Date();
      v_weekAgo.setDate(v_weekAgo.getDate() - 7);
      v_dateFilter = { last_searched: { $gte: v_weekAgo } };
    } else if (period === 'month') {
      const v_monthAgo = new Date();
      v_monthAgo.setMonth(v_monthAgo.getMonth() - 1);
      v_dateFilter = { last_searched: { $gte: v_monthAgo } };
    }

    const v_popularSearches = await SearchAnalytics.find(v_dateFilter)
      .sort({ search_count: -1 })
      .limit(parseInt(limit));

    const v_totalSearches = await SearchAnalytics.aggregate([
      { $match: v_dateFilter },
      { $group: { _id: null, total: { $sum: '$search_count' } } }
    ]);

    const v_result = {
      popular_searches: v_popularSearches,
      total_searches: v_totalSearches[0]?.total || 0,
      period: period,
      limit: parseInt(limit)
    };

    f_setCachedResult(v_cacheKey, v_result, 'analytics');

    p_res.json(v_result);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};


const f_recordSearch = async (p_userId, p_query, p_searchType, p_filters, p_resultsCount) => {
  try {
    if (p_userId) {
      const v_searchHistory = new SearchHistory({
        user_id: p_userId,
        query: p_query,
        search_type: p_searchType,
        filters: p_filters,
        results_count: p_resultsCount
      });
      await v_searchHistory.save();
    }

    await SearchAnalytics.findOneAndUpdate(
      { query: p_query },
      {
        $inc: { 
          search_count: 1,
          [`search_types.${p_searchType}`]: 1
        },
        $set: { last_searched: new Date() },
        $setOnInsert: { avg_results_count: p_resultsCount }
      },
      { 
        upsert: true,
        new: true
      }
    );
  } catch (p_error) {
    console.error('Error registrando búsqueda:', p_error);
  }
};

const f_getFacets = async (p_baseFilter) => {
  try {
    const v_facets = await EmbeddedMovie.aggregate([
      { $match: p_baseFilter },
      {
        $facet: {
          genres: [
            { $unwind: '$genres' },
            { $group: { _id: '$genres', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ],
          years: [
            { $group: { _id: '$year', count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 20 }
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
      }
    ]);

    return v_facets[0] || {};
  } catch (p_error) {
    console.error('Error obteniendo facetas:', p_error);
    return {};
  }
};

const f_getTitleSuggestions = async (p_query, p_limit) => {
  try {
    const v_titles = await EmbeddedMovie.find(
      { title: { $regex: p_query, $options: 'i' } },
      { title: 1, year: 1, 'imdb.rating': 1 }
    )
    .sort({ 'imdb.rating': -1 })
    .limit(parseInt(p_limit));

    return v_titles.map(movie => ({
      title: movie.title,
      year: movie.year,
      rating: movie.imdb?.rating
    }));
  } catch (p_error) {
    console.error('Error obteniendo sugerencias de títulos:', p_error);
    return [];
  }
};

const f_getDirectorSuggestions = async (p_query, p_limit) => {
  try {
    const v_directors = await EmbeddedMovie.aggregate([
      { $unwind: '$directors' },
      { $match: { directors: { $regex: p_query, $options: 'i' } } },
      { $group: { _id: '$directors', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(p_limit) }
    ]);

    return v_directors.map(director => ({
      name: director._id,
      movie_count: director.count
    }));
  } catch (p_error) {
    console.error('Error obteniendo sugerencias de directores:', p_error);
    return [];
  }
};

const f_getActorSuggestions = async (p_query, p_limit) => {
  try {
    const v_actors = await EmbeddedMovie.aggregate([
      { $unwind: '$cast' },
      { $match: { cast: { $regex: p_query, $options: 'i' } } },
      { $group: { _id: '$cast', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(p_limit) }
    ]);

    return v_actors.map(actor => ({
      name: actor._id,
      movie_count: actor.count
    }));
  } catch (p_error) {
    console.error('Error obteniendo sugerencias de actores:', p_error);
    return [];
  }
};

const f_getGenreSuggestions = async (p_query, p_limit) => {
  try {
    const v_genres = await EmbeddedMovie.aggregate([
      { $unwind: '$genres' },
      { $match: { genres: { $regex: p_query, $options: 'i' } } },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(p_limit) }
    ]);

    return v_genres.map(genre => ({
      name: genre._id,
      movie_count: genre.count
    }));
  } catch (p_error) {
    console.error('Error obteniendo sugerencias de géneros:', p_error);
    return [];
  }
};

module.exports = {
  f_fullTextSearch,
  f_vectorSearch,
  f_hybridSearch,
  f_facetedSearch,
  f_autocomplete,
  f_searchHistory,
  f_popularSearches
};
