const express = require('express');
const {
  f_getAllPlaylists,
  f_getPlaylistById,
  f_createPlaylist,
  f_updatePlaylist,
  f_deletePlaylist,
  f_addMovieToPlaylist,
  f_removeMovieFromPlaylist,
  f_sharePlaylist,
  f_getSharedPlaylist,
  f_addCollaborator,
  f_removeCollaborator,
  f_getUserWatchlist,
  f_getUserFavorites,
  f_exportPlaylist,
  f_importPlaylist
} = require('../controllers/playlistController');

const v_router = express.Router();

v_router.get('/', f_getAllPlaylists);
v_router.get('/:id', f_getPlaylistById);
v_router.post('/', f_createPlaylist);
v_router.put('/:id', f_updatePlaylist);
v_router.delete('/:id', f_deletePlaylist);

v_router.post('/:id/movies', f_addMovieToPlaylist);
v_router.delete('/:id/movies/:movieId', f_removeMovieFromPlaylist);

v_router.post('/:id/share', f_sharePlaylist);
v_router.get('/shared/:token', f_getSharedPlaylist);

v_router.post('/:id/collaborators', f_addCollaborator);
v_router.delete('/:id/collaborators/:userId', f_removeCollaborator);

v_router.get('/user/watchlist', f_getUserWatchlist);
v_router.get('/user/favorites', f_getUserFavorites);

v_router.get('/:id/export', f_exportPlaylist);
v_router.post('/import', f_importPlaylist);

module.exports = v_router;
