class SearchCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Máximo 1000 entradas en cache
    this.ttl = 300000; // TTL de 5 minutos
  }
  
  f_generateKey(p_query, p_filters, p_searchType) {
    return `${p_searchType}:${p_query}:${JSON.stringify(p_filters)}`;
  }
  
  f_get(p_key) {
    const v_entry = this.cache.get(p_key);
    if (!v_entry) return null;
    
    if (Date.now() - v_entry.timestamp > this.ttl) {
      this.cache.delete(p_key);
      return null;
    }
    
    return v_entry.data;
  }
  
  f_set(p_key, p_data) {
    if (this.cache.size >= this.maxSize) {
      const v_firstKey = this.cache.keys().next().value;
      this.cache.delete(v_firstKey);
    }
    
    this.cache.set(p_key, {
      data: p_data,
      timestamp: Date.now()
    });
  }
  
  f_clear() {
    this.cache.clear();
  }
}

module.exports = new SearchCache();
