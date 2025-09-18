const { cosine, euclidean } = require('ml-distance');

const f_calculateCosineSimilarity = (p_vector1, p_vector2) => {
  try {
    if (!p_vector1 || !p_vector2 || !Array.isArray(p_vector1) || !Array.isArray(p_vector2)) {
      return 0;
    }
    
    if (p_vector1.length !== p_vector2.length) {
      return 0;
    }
    
    return 1 - cosine(p_vector1, p_vector2);
  } catch (p_error) {
    console.error('Error calculando similitud coseno:', p_error);
    return 0;
  }
};

const f_calculateEuclideanDistance = (p_vector1, p_vector2) => {
  try {
    if (!p_vector1 || !p_vector2 || !Array.isArray(p_vector1) || !Array.isArray(p_vector2)) {
      return Infinity;
    }
    
    if (p_vector1.length !== p_vector2.length) {
      return Infinity;
    }
    
    return euclidean(p_vector1, p_vector2);
  } catch (p_error) {
    console.error('Error calculando distancia euclidiana:', p_error);
    return Infinity;
  }
};

const f_normalizeVector = (p_vector) => {
  try {
    if (!p_vector || !Array.isArray(p_vector)) {
      return [];
    }
    
    const v_magnitude = Math.sqrt(p_vector.reduce((sum, val) => sum + val * val, 0));
    
    if (v_magnitude === 0) {
      return p_vector;
    }
    
    return p_vector.map(val => val / v_magnitude);
  } catch (p_error) {
    console.error('Error normalizando vector:', p_error);
    return p_vector;
  }
};

const f_calculateDotProduct = (p_vector1, p_vector2) => {
  try {
    if (!p_vector1 || !p_vector2 || !Array.isArray(p_vector1) || !Array.isArray(p_vector2)) {
      return 0;
    }
    
    if (p_vector1.length !== p_vector2.length) {
      return 0;
    }
    
    return p_vector1.reduce((sum, val, index) => sum + val * p_vector2[index], 0);
  } catch (p_error) {
    console.error('Error calculando producto punto:', p_error);
    return 0;
  }
};

const f_generateQueryEmbedding = async (p_query) => {
  const v_dimension = 1536; // Dimensión típica de embeddings
  const v_vector = Array.from({ length: v_dimension }, () => Math.random() - 0.5);
  return f_normalizeVector(v_vector);
};

module.exports = {
  f_calculateCosineSimilarity,
  f_calculateEuclideanDistance,
  f_normalizeVector,
  f_calculateDotProduct,
  f_generateQueryEmbedding
};
