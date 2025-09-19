const Playlist = require('../models/Playlist');
const EmbeddedMovie = require('../models/EmbeddedMovie');
const Movie = require('../models/Movie');
const crypto = require('crypto');

const f_getAllPlaylists = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_userId = p_req.query.user_id;

    if (!v_userId) {
      return p_res.status(400).json({ message: 'user_id is required' });
    }

    const v_filter = {
      $or: [
        { owner_id: v_userId },
        { 'collaborators.user_id': v_userId }
      ]
    };

    const v_playlists = await Playlist.find(v_filter)
      .populate('owner_id', 'name email')
      .populate('movies.movie_id', 'title poster year genres')
      .populate('collaborators.user_id', 'name email')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ updated_date: -1 });

    const v_total = await Playlist.countDocuments(v_filter);

    p_res.json({
      playlists: v_playlists,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalPlaylists: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPlaylistById = async (p_req, p_res) => {
  try {
    const v_playlist = await Playlist.findById(p_req.params.id)
      .populate('owner_id', 'name email')
      .populate('movies.movie_id')
      .populate('collaborators.user_id', 'name email');

    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    p_res.json(v_playlist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createPlaylist = async (p_req, p_res) => {
  try {
    const v_playlistData = {
      ...p_req.body,
      updated_date: new Date()
    };

    const v_playlist = new Playlist(v_playlistData);
    const v_savedPlaylist = await v_playlist.save();
    
    const v_populatedPlaylist = await Playlist.findById(v_savedPlaylist._id)
      .populate('owner_id', 'name email')
      .populate('movies.movie_id', 'title poster year genres');

    p_res.status(201).json(v_populatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updatePlaylist = async (p_req, p_res) => {
  try {
    const v_updateData = {
      ...p_req.body,
      updated_date: new Date()
    };

    const v_playlist = await Playlist.findByIdAndUpdate(
      p_req.params.id,
      v_updateData,
      { new: true, runValidators: true }
    )
    .populate('owner_id', 'name email')
    .populate('movies.movie_id', 'title poster year genres')
    .populate('collaborators.user_id', 'name email');

    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    p_res.json(v_playlist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deletePlaylist = async (p_req, p_res) => {
  try {
    const v_playlist = await Playlist.findByIdAndDelete(p_req.params.id);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }
    p_res.json({ message: 'Playlist deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_addMovieToPlaylist = async (p_req, p_res) => {
  try {
    const { movie_id } = p_req.body;
    const v_playlistId = p_req.params.id;

    let v_movie = await EmbeddedMovie.findById(movie_id);
    if (!v_movie) {
      v_movie = await Movie.findById(movie_id);
    }
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    const v_playlist = await Playlist.findById(v_playlistId);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    const v_existingMovie = v_playlist.movies.find(
      movie => movie.movie_id.toString() === movie_id
    );
    if (v_existingMovie) {
      return p_res.status(400).json({ message: 'Movie already in playlist' });
    }

    const v_nextOrderIndex = v_playlist.movies.length;
    v_playlist.movies.push({
      movie_id: movie_id,
      order_index: v_nextOrderIndex
    });
    v_playlist.updated_date = new Date();

    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(v_playlistId)
      .populate('movies.movie_id', 'title poster year genres');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_removeMovieFromPlaylist = async (p_req, p_res) => {
  try {
    const { movie_id } = p_req.params;
    const v_playlistId = p_req.params.id;

    const v_playlist = await Playlist.findById(v_playlistId);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    v_playlist.movies = v_playlist.movies.filter(
      movie => movie.movie_id.toString() !== movie_id
    );
    v_playlist.updated_date = new Date();

    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(v_playlistId)
      .populate('movies.movie_id', 'title poster year genres');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_generateShareToken = async (p_req, p_res) => {
  try {
    const v_playlistId = p_req.params.id;
    const v_shareToken = crypto.randomBytes(32).toString('hex');

    const v_playlist = await Playlist.findByIdAndUpdate(
      v_playlistId,
      { share_token: v_shareToken, updated_date: new Date() },
      { new: true }
    );

    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    p_res.json({ share_token: v_shareToken });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getPlaylistByShareToken = async (p_req, p_res) => {
  try {
    const { token } = p_req.params;

    const v_playlist = await Playlist.findOne({ share_token: token })
      .populate('owner_id', 'name email')
      .populate('movies.movie_id')
      .populate('collaborators.user_id', 'name email');

    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found or invalid share token' });
    }

    p_res.json(v_playlist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_addCollaborator = async (p_req, p_res) => {
  try {
    const { user_id, role = 'viewer' } = p_req.body;
    const v_playlistId = p_req.params.id;

    const v_playlist = await Playlist.findById(v_playlistId);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    const v_existingCollaborator = v_playlist.collaborators.find(
      collab => collab.user_id.toString() === user_id
    );
    if (v_existingCollaborator) {
      return p_res.status(400).json({ message: 'User is already a collaborator' });
    }

    v_playlist.collaborators.push({
      user_id: user_id,
      role: role
    });
    v_playlist.updated_date = new Date();

    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(v_playlistId)
      .populate('collaborators.user_id', 'name email');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_removeCollaborator = async (p_req, p_res) => {
  try {
    const { user_id } = p_req.params;
    const v_playlistId = p_req.params.id;

    const v_playlist = await Playlist.findById(v_playlistId);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    v_playlist.collaborators = v_playlist.collaborators.filter(
      collab => collab.user_id.toString() !== user_id
    );
    v_playlist.updated_date = new Date();

    await v_playlist.save();

    p_res.json({ message: 'Collaborator removed successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_discoverPublicPlaylists = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;

    const v_filter = { visibility: 'public' };

    const v_playlists = await Playlist.find(v_filter)
      .populate('owner_id', 'name email')
      .populate('movies.movie_id', 'title poster year genres')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ updated_date: -1 });

    const v_total = await Playlist.countDocuments(v_filter);

    p_res.json({
      playlists: v_playlists,
      currentPage: v_page,
      totalPages: Math.ceil(v_total / v_limit),
      totalPlaylists: v_total
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_searchPlaylists = async (p_req, p_res) => {
  try {
    const { name, owner_name, type } = p_req.query;
    const v_filter = { visibility: 'public' };

    if (name) {
      v_filter.name = { $regex: name, $options: 'i' };
    }
    if (type) {
      v_filter.type = type;
    }

    let v_playlists = await Playlist.find(v_filter)
      .populate('owner_id', 'name email')
      .populate('movies.movie_id', 'title poster year genres')
      .sort({ updated_date: -1 });

    if (owner_name) {
      v_playlists = v_playlists.filter(playlist => 
        playlist.owner_id.name.toLowerCase().includes(owner_name.toLowerCase())
      );
    }

    p_res.json(v_playlists);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserWatchlist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.user_id;

    let v_watchlist = await Playlist.findOne({
      owner_id: v_userId,
      type: 'watchlist'
    }).populate('movies.movie_id');

    if (!v_watchlist) {
      v_watchlist = new Playlist({
        name: 'My Watchlist',
        owner_id: v_userId,
        type: 'watchlist',
        visibility: 'private'
      });
      await v_watchlist.save();
      v_watchlist = await Playlist.findById(v_watchlist._id).populate('movies.movie_id');
    }

    p_res.json(v_watchlist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserFavorites = async (p_req, p_res) => {
  try {
    const v_userId = p_req.params.user_id;

    let v_favorites = await Playlist.findOne({
      owner_id: v_userId,
      type: 'favorites'
    }).populate('movies.movie_id');

    if (!v_favorites) {
      v_favorites = new Playlist({
        name: 'My Favorites',
        owner_id: v_userId,
        type: 'favorites',
        visibility: 'private'
      });
      await v_favorites.save();
      v_favorites = await Playlist.findById(v_favorites._id).populate('movies.movie_id');
    }

    p_res.json(v_favorites);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

module.exports = {
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
};
