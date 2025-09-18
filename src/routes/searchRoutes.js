const express = require('express');
const {
  f_fullTextSearch,
  f_vectorSearch,
  f_hybridSearch,
  f_facetedSearch,
  f_autocomplete,
  f_searchHistory,
  f_popularSearches
} = require('../controllers/searchController');
const { f_extractUser, f_requireAuth } = require('../middleware/authMiddleware');

const v_router = express.Router();

v_router.use(f_extractUser);

v_router.get('/text', f_fullTextSearch);
v_router.get('/vector', f_vectorSearch);
v_router.get('/hybrid', f_hybridSearch);
v_router.get('/faceted', f_facetedSearch);
v_router.get('/autocomplete', f_autocomplete);
v_router.get('/popular', f_popularSearches);

v_router.get('/history', f_requireAuth, f_searchHistory);

module.exports = v_router;
