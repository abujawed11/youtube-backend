const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

class AuthService {
  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    this.jwtSecret = process.env.JWT_SECRET;
  }

  // Verify Google ID token
  async verifyGoogleToken(idToken) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }

  // Generate JWT token
  generateJWTToken(user) {
    const payload = {
      userId: user._id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: '30d' 
    });
  }

  // Verify JWT token
  verifyJWTToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  // Sign in or create user with Google
  async signInWithGoogle(idToken) {
    try {
      const googleUser = await this.verifyGoogleToken(idToken);
      
      let user = await User.findOne({ googleId: googleUser.googleId });
      
      if (user) {
        // Update last login time and user info
        user.lastLoginAt = new Date();
        user.name = googleUser.name;
        user.picture = googleUser.picture;
        await user.save();
      } else {
        // Create new user
        user = new User({
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          watchHistory: []
        });
        await user.save();
      }

      const token = this.generateJWTToken(user);
      
      return {
        user: {
          id: user._id,
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
        token
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Get user by JWT token
  async getUserByToken(token) {
    try {
      const decoded = this.verifyJWTToken(token);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
      };
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  // Add video to watch history
  async addToWatchHistory(userId, videoData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove existing entry for this video
      user.watchHistory = user.watchHistory.filter(
        item => item.videoId !== videoData.videoId
      );

      // Add new entry at the beginning
      user.watchHistory.unshift({
        videoId: videoData.videoId,
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        channelTitle: videoData.channelTitle,
        duration: videoData.duration,
        watchedAt: new Date(),
        watchedDuration: videoData.watchedDuration || 0
      });

      await user.save();
      
      return user.watchHistory;
    } catch (error) {
      throw new Error(`Failed to add to history: ${error.message}`);
    }
  }

  // Get watch history
  async getWatchHistory(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user.watchHistory.sort((a, b) => b.watchedAt - a.watchedAt);
    } catch (error) {
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  // Clear watch history
  async clearWatchHistory(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.watchHistory = [];
      await user.save();
      
      return [];
    } catch (error) {
      throw new Error(`Failed to clear history: ${error.message}`);
    }
  }
}

module.exports = new AuthService();