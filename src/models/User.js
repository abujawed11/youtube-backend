const mongoose = require('mongoose');

const watchHistorySchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    required: true
  },
  channelTitle: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  watchedAt: {
    type: Date,
    default: Date.now
  },
  watchedDuration: {
    type: Number, // in seconds
    default: 0
  }
});

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  picture: {
    type: String
  },
  watchHistory: [watchHistorySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  }
});

// Limit watch history to 100 items per user
userSchema.pre('save', function(next) {
  if (this.watchHistory.length > 100) {
    this.watchHistory = this.watchHistory
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, 100);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);