const mongoose = require('mongoose');

const c_playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  movies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmbeddedMovie'
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['watchlist', 'favorites', 'custom'],
    default: 'custom'
  },
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    }
  }],
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  collection: 'playlists',
  timestamps: true
});

c_playlistSchema.index({ userId: 1, type: 1 });
c_playlistSchema.index({ shareToken: 1 });
c_playlistSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Playlist', c_playlistSchema);
