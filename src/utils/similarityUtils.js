const f_cosineSimilarity = (p_vectorA, p_vectorB) => {
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

const f_userSimilarity = (p_ratingsA, p_ratingsB) => {
  const v_commonMovies = p_ratingsA.filter(rA => 
    p_ratingsB.some(rB => rB.movie_id.toString() === rA.movie_id.toString())
  );

  if (v_commonMovies.length === 0) return 0;

  const v_vectorA = v_commonMovies.map(r => r.rating);
  const v_vectorB = v_commonMovies.map(rA => {
    const rB = p_ratingsB.find(rB => rB.movie_id.toString() === rA.movie_id.toString());
    return rB ? rB.rating : 0;
  });

  return f_cosineSimilarity(v_vectorA, v_vectorB);
};

const f_calculateGenreDiversity = (p_movies) => {
  const v_allGenres = p_movies.flatMap(movie => movie.genres || []);
  const v_uniqueGenres = [...new Set(v_allGenres)];
  return v_uniqueGenres.length / Math.max(v_allGenres.length, 1);
};

module.exports = {
  f_cosineSimilarity,
  f_userSimilarity,
  f_calculateGenreDiversity
};
