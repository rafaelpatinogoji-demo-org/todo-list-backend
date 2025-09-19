const express = require('express');
const {
  f_getAllPlaylists,
  f_getPlaylistById,
  f_createPlaylist,
  f_updatePlaylist,
  f_deletePlaylist,
  f_addMovieToPlaylist,
  f_removeMovieFromPlaylist,
  f_generateShareToken,
  f_getPlaylistByShareToken,
  f_addCollaborator,
  f_removeCollaborator,
  f_discoverPublicPlaylists,
  f_searchPlaylists,
  f_getUserWatchlist,
  f_getUserFavorites
} = require('../controllers/playlistController');

const v_router = express.Router();

v_router.get('/', f_getAllPlaylists);
v_router.get('/discover', f_discoverPublicPlaylists);
v_router.get('/search', f_searchPlaylists);
v_router.get('/share/:token', f_getPlaylistByShareToken);
v_router.get('/user/:user_id/watchlist', f_getUserWatchlist);
v_router.get('/user/:user_id/favorites', f_getUserFavorites);
v_router.get('/:id', f_getPlaylistById);
v_router.post('/', f_createPlaylist);
v_router.put('/:id', f_updatePlaylist);
v_router.delete('/:id', f_deletePlaylist);

v_router.post('/:id/movies', f_addMovieToPlaylist);
v_router.delete('/:id/movies/:movie_id', f_removeMovieFromPlaylist);

v_router.post('/:id/share', f_generateShareToken);

v_router.post('/:id/collaborators', f_addCollaborator);
v_router.delete('/:id/collaborators/:user_id', f_removeCollaborator);

module.exports = v_router;
