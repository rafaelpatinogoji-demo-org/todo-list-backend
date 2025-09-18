const NodeCache = require('node-cache');

const v_searchCache = new NodeCache({ stdTTL: 600 });

const v_autocompleteCache = new NodeCache({ stdTTL: 1800 });

const v_analyticsCache = new NodeCache({ stdTTL: 3600 });

const f_getCachedResult = (p_key, p_cacheType = 'search') => {
  try {
    const v_cache = f_getCache(p_cacheType);
    return v_cache.get(p_key);
  } catch (p_error) {
    console.error('Error obteniendo cache:', p_error);
    return null;
  }
};

const f_setCachedResult = (p_key, p_data, p_cacheType = 'search') => {
  try {
    const v_cache = f_getCache(p_cacheType);
    return v_cache.set(p_key, p_data);
  } catch (p_error) {
    console.error('Error guardando en cache:', p_error);
    return false;
  }
};

const f_getCache = (p_cacheType) => {
  switch (p_cacheType) {
    case 'autocomplete':
      return v_autocompleteCache;
    case 'analytics':
      return v_analyticsCache;
    default:
      return v_searchCache;
  }
};

const f_generateSearchCacheKey = (p_query, p_filters = {}, p_searchType = 'text') => {
  const v_filterString = JSON.stringify(p_filters);
  return `search:${p_searchType}:${p_query}:${v_filterString}`;
};

const f_clearCache = (p_cacheType = 'search') => {
  try {
    const v_cache = f_getCache(p_cacheType);
    v_cache.flushAll();
    return true;
  } catch (p_error) {
    console.error('Error limpiando cache:', p_error);
    return false;
  }
};

const f_getCacheStats = () => {
  return {
    search: v_searchCache.getStats(),
    autocomplete: v_autocompleteCache.getStats(),
    analytics: v_analyticsCache.getStats()
  };
};

module.exports = {
  f_getCachedResult,
  f_setCachedResult,
  f_generateSearchCacheKey,
  f_clearCache,
  f_getCacheStats
};
