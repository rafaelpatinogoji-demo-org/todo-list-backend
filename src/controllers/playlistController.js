const Playlist = require('../models/Playlist');
const EmbeddedMovie = require('../models/EmbeddedMovie');
const User = require('../models/User');
const crypto = require('crypto');

const f_validateOwnership = (p_playlist, p_userId) => {
  return p_playlist.userId.toString() === p_userId || 
         p_playlist.collaborators.some(collab => 
           collab.userId.toString() === p_userId && collab.permission === 'write'
         );
};

const f_validateReadAccess = (p_playlist, p_userId) => {
  return p_playlist.userId.toString() === p_userId || 
         p_playlist.collaborators.some(collab => collab.userId.toString() === p_userId) ||
         p_playlist.isPublic;
};

const f_getAllPlaylists = async (p_req, p_res) => {
  try {
    const v_page = parseInt(p_req.query.page) || 1;
    const v_limit = parseInt(p_req.query.limit) || 10;
    const v_skip = (v_page - 1) * v_limit;
    const v_userId = p_req.headers['user-id'];
    
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User ID required in headers' });
    }

    const v_filter = {
      $or: [
        { userId: v_userId },
        { collaborators: { $elemMatch: { userId: v_userId } } },
        { isPublic: true }
      ]
    };

    if (p_req.query.type) {
      v_filter.type = p_req.query.type;
    }

    if (p_req.query.search) {
      v_filter.name = { $regex: p_req.query.search, $options: 'i' };
    }

    const v_playlists = await Playlist.find(v_filter)
      .populate('userId', 'name email')
      .populate('movies', 'title year poster')
      .populate('collaborators.userId', 'name email')
      .skip(v_skip)
      .limit(v_limit)
      .sort({ updatedAt: -1 });

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
    const v_userId = p_req.headers['user-id'];
    const v_playlist = await Playlist.findById(p_req.params.id)
      .populate('userId', 'name email')
      .populate('movies', 'title year poster plot genres runtime')
      .populate('collaborators.userId', 'name email');
    
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (!f_validateReadAccess(v_playlist, v_userId)) {
      return p_res.status(403).json({ message: 'Access denied' });
    }

    p_res.json(v_playlist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_createPlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User ID required in headers' });
    }

    const v_playlistData = {
      ...p_req.body,
      userId: v_userId
    };

    if (v_playlistData.type === 'watchlist' || v_playlistData.type === 'favorites') {
      const v_existingPlaylist = await Playlist.findOne({
        userId: v_userId,
        type: v_playlistData.type
      });
      
      if (v_existingPlaylist) {
        return p_res.status(400).json({ 
          message: `User already has a ${v_playlistData.type} playlist` 
        });
      }
    }

    const v_playlist = new Playlist(v_playlistData);
    const v_savedPlaylist = await v_playlist.save();
    
    const v_populatedPlaylist = await Playlist.findById(v_savedPlaylist._id)
      .populate('userId', 'name email')
      .populate('movies', 'title year poster')
      .populate('collaborators.userId', 'name email');
    
    p_res.status(201).json(v_populatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_updatePlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const v_playlist = await Playlist.findById(p_req.params.id);
    
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (!f_validateOwnership(v_playlist, v_userId)) {
      return p_res.status(403).json({ message: 'Access denied' });
    }

    const v_updatedPlaylist = await Playlist.findByIdAndUpdate(
      p_req.params.id,
      p_req.body,
      { new: true, runValidators: true }
    )
    .populate('userId', 'name email')
    .populate('movies', 'title year poster')
    .populate('collaborators.userId', 'name email');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_deletePlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const v_playlist = await Playlist.findById(p_req.params.id);
    
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (v_playlist.userId.toString() !== v_userId) {
      return p_res.status(403).json({ message: 'Only playlist owner can delete' });
    }

    await Playlist.findByIdAndDelete(p_req.params.id);
    p_res.json({ message: 'Playlist deleted successfully' });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_addMovieToPlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const { movieId } = p_req.body;
    
    const v_playlist = await Playlist.findById(p_req.params.id);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (!f_validateOwnership(v_playlist, v_userId)) {
      return p_res.status(403).json({ message: 'Access denied' });
    }

    const v_movie = await EmbeddedMovie.findById(movieId);
    if (!v_movie) {
      return p_res.status(404).json({ message: 'Movie not found' });
    }

    if (v_playlist.movies.includes(movieId)) {
      return p_res.status(400).json({ message: 'Movie already in playlist' });
    }

    v_playlist.movies.push(movieId);
    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(p_req.params.id)
      .populate('movies', 'title year poster');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_removeMovieFromPlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const { movieId } = p_req.params;
    
    const v_playlist = await Playlist.findById(p_req.params.id);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (!f_validateOwnership(v_playlist, v_userId)) {
      return p_res.status(403).json({ message: 'Access denied' });
    }

    v_playlist.movies = v_playlist.movies.filter(
      movie => movie.toString() !== movieId
    );
    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(p_req.params.id)
      .populate('movies', 'title year poster');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_sharePlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const v_playlist = await Playlist.findById(p_req.params.id);
    
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (v_playlist.userId.toString() !== v_userId) {
      return p_res.status(403).json({ message: 'Only playlist owner can share' });
    }

    if (!v_playlist.shareToken) {
      v_playlist.shareToken = crypto.randomBytes(32).toString('hex');
      await v_playlist.save();
    }

    p_res.json({ 
      shareToken: v_playlist.shareToken,
      shareUrl: `/api/playlists/shared/${v_playlist.shareToken}`
    });
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getSharedPlaylist = async (p_req, p_res) => {
  try {
    const { token } = p_req.params;
    const v_playlist = await Playlist.findOne({ shareToken: token })
      .populate('userId', 'name email')
      .populate('movies', 'title year poster plot genres runtime')
      .populate('collaborators.userId', 'name email');
    
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Shared playlist not found' });
    }

    p_res.json(v_playlist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_addCollaborator = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const { collaboratorId, permission = 'read' } = p_req.body;
    
    const v_playlist = await Playlist.findById(p_req.params.id);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (v_playlist.userId.toString() !== v_userId) {
      return p_res.status(403).json({ message: 'Only playlist owner can add collaborators' });
    }

    const v_collaborator = await User.findById(collaboratorId);
    if (!v_collaborator) {
      return p_res.status(404).json({ message: 'User not found' });
    }

    const v_existingCollaborator = v_playlist.collaborators.find(
      collab => collab.userId.toString() === collaboratorId
    );

    if (v_existingCollaborator) {
      v_existingCollaborator.permission = permission;
    } else {
      v_playlist.collaborators.push({ userId: collaboratorId, permission });
    }

    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(p_req.params.id)
      .populate('collaborators.userId', 'name email');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_removeCollaborator = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const { userId: collaboratorId } = p_req.params;
    
    const v_playlist = await Playlist.findById(p_req.params.id);
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (v_playlist.userId.toString() !== v_userId) {
      return p_res.status(403).json({ message: 'Only playlist owner can remove collaborators' });
    }

    v_playlist.collaborators = v_playlist.collaborators.filter(
      collab => collab.userId.toString() !== collaboratorId
    );

    await v_playlist.save();

    const v_updatedPlaylist = await Playlist.findById(p_req.params.id)
      .populate('collaborators.userId', 'name email');

    p_res.json(v_updatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
  }
};

const f_getUserWatchlist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User ID required in headers' });
    }

    let v_watchlist = await Playlist.findOne({ 
      userId: v_userId, 
      type: 'watchlist' 
    }).populate('movies', 'title year poster plot genres runtime');

    if (!v_watchlist) {
      v_watchlist = new Playlist({
        name: 'Mi Lista de Pendientes',
        description: 'Películas que quiero ver',
        userId: v_userId,
        type: 'watchlist'
      });
      await v_watchlist.save();
    }

    p_res.json(v_watchlist);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_getUserFavorites = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User ID required in headers' });
    }

    let v_favorites = await Playlist.findOne({ 
      userId: v_userId, 
      type: 'favorites' 
    }).populate('movies', 'title year poster plot genres runtime');

    if (!v_favorites) {
      v_favorites = new Playlist({
        name: 'Mis Favoritas',
        description: 'Mis películas favoritas',
        userId: v_userId,
        type: 'favorites'
      });
      await v_favorites.save();
    }

    p_res.json(v_favorites);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_exportPlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const v_playlist = await Playlist.findById(p_req.params.id)
      .populate('movies', 'title year plot genres runtime cast directors')
      .populate('userId', 'name email');
    
    if (!v_playlist) {
      return p_res.status(404).json({ message: 'Playlist not found' });
    }

    if (!f_validateReadAccess(v_playlist, v_userId)) {
      return p_res.status(403).json({ message: 'Access denied' });
    }

    const v_exportData = {
      name: v_playlist.name,
      description: v_playlist.description,
      type: v_playlist.type,
      createdAt: v_playlist.createdAt,
      owner: v_playlist.userId.name,
      movies: v_playlist.movies.map(movie => ({
        title: movie.title,
        year: movie.year,
        plot: movie.plot,
        genres: movie.genres,
        runtime: movie.runtime,
        cast: movie.cast,
        directors: movie.directors
      }))
    };

    p_res.setHeader('Content-Type', 'application/json');
    p_res.setHeader('Content-Disposition', `attachment; filename="${v_playlist.name}.json"`);
    p_res.json(v_exportData);
  } catch (p_error) {
    p_res.status(500).json({ message: p_error.message });
  }
};

const f_importPlaylist = async (p_req, p_res) => {
  try {
    const v_userId = p_req.headers['user-id'];
    const { playlistData } = p_req.body;
    
    if (!v_userId) {
      return p_res.status(401).json({ message: 'User ID required in headers' });
    }

    if (!playlistData || !playlistData.name || !playlistData.movies) {
      return p_res.status(400).json({ message: 'Invalid playlist data' });
    }

    const v_movieIds = [];
    for (const movieData of playlistData.movies) {
      const v_movie = await EmbeddedMovie.findOne({ 
        title: movieData.title, 
        year: movieData.year 
      });
      if (v_movie) {
        v_movieIds.push(v_movie._id);
      }
    }

    const v_playlist = new Playlist({
      name: playlistData.name + ' (Importada)',
      description: playlistData.description || 'Playlist importada',
      userId: v_userId,
      movies: v_movieIds,
      type: 'custom'
    });

    await v_playlist.save();

    const v_populatedPlaylist = await Playlist.findById(v_playlist._id)
      .populate('movies', 'title year poster');

    p_res.status(201).json(v_populatedPlaylist);
  } catch (p_error) {
    p_res.status(400).json({ message: p_error.message });
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
  f_sharePlaylist,
  f_getSharedPlaylist,
  f_addCollaborator,
  f_removeCollaborator,
  f_getUserWatchlist,
  f_getUserFavorites,
  f_exportPlaylist,
  f_importPlaylist
};
