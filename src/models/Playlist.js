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
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['custom', 'watchlist', 'favorites'],
    default: 'custom'
  },
  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },
  movies: [{
    movie_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    added_date: {
      type: Date,
      default: Date.now
    },
    order_index: {
      type: Number,
      default: 0
    }
  }],
  collaborators: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer'
    },
    added_date: {
      type: Date,
      default: Date.now
    }
  }],
  share_token: {
    type: String,
    unique: true,
    sparse: true
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  updated_date: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'playlists'
});

c_playlistSchema.index({ owner_id: 1, type: 1 });
c_playlistSchema.index({ visibility: 1 });
c_playlistSchema.index({ share_token: 1 });

module.exports = mongoose.model('Playlist', c_playlistSchema);
