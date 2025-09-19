const express = require('express');
const {
  f_fullTextSearch,
  f_vectorSearch,
  f_hybridSearch,
  f_searchAutocomplete,
  f_facetedSearch,
  f_getUserSearchHistory,
  f_getPopularSearches
} = require('../controllers/searchController');
const { f_requireAuth } = require('../middleware/authMiddleware');

const v_router = express.Router();

v_router.post('/text', f_fullTextSearch);

v_router.post('/vector', f_vectorSearch);

v_router.post('/hybrid', f_hybridSearch);

v_router.get('/autocomplete', f_searchAutocomplete);

v_router.post('/faceted', f_facetedSearch);

v_router.get('/history', f_requireAuth, f_getUserSearchHistory);

v_router.get('/popular', f_getPopularSearches);

module.exports = v_router;
