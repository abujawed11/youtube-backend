const authService = require('../services/authService');

class AuthController {
  // Google Sign In
  async googleSignIn(req, res, next) {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: 'Google ID token is required' });
      }

      const result = await authService.signInWithGoogle(idToken);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Add to watch history
  async addToWatchHistory(req, res, next) {
    try {
      const { videoId, title, thumbnail, channelTitle, duration, watchedDuration } = req.body;
      
      if (!videoId || !title || !thumbnail || !channelTitle) {
        return res.status(400).json({ 
          error: 'Video ID, title, thumbnail, and channel title are required' 
        });
      }

      const videoData = {
        videoId,
        title,
        thumbnail,
        channelTitle,
        duration: duration || 'Unknown',
        watchedDuration: watchedDuration || 0
      };

      const history = await authService.addToWatchHistory(req.user.id, videoData);

      res.json({
        success: true,
        data: { history }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get watch history
  async getWatchHistory(req, res, next) {
    try {
      const history = await authService.getWatchHistory(req.user.id);

      res.json({
        success: true,
        data: { history }
      });
    } catch (error) {
      next(error);
    }
  }

  // Clear watch history
  async clearWatchHistory(req, res, next) {
    try {
      await authService.clearWatchHistory(req.user.id);

      res.json({
        success: true,
        message: 'Watch history cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();