const youtubeService = require('../services/youtubeService');

class YouTubeController {
  // Search videos
  async searchVideos(req, res, next) {
    try {
      const { q: query, maxResults = 20, pageToken } = req.query;
      
      if (!query || query.trim() === '') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const results = await youtubeService.searchVideos(
        query.trim(),
        parseInt(maxResults),
        pageToken
      );

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  // Get video details and stream URLs
  async getVideo(req, res, next) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Video ID is required' });
      }

      // Validate YouTube video ID format
      const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
      if (!videoIdRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID format' });
      }

      const videoData = await youtubeService.getVideoStreams(id);

      res.json({
        success: true,
        data: videoData
      });
    } catch (error) {
      next(error);
    }
  }

  // Get search suggestions
  async getSearchSuggestions(req, res, next) {
    try {
      const { q: query } = req.query;
      
      if (!query || query.trim() === '') {
        return res.json({ success: true, data: [] });
      }

      const suggestions = await youtubeService.getSearchSuggestions(query.trim());

      res.json({
        success: true,
        data: suggestions.slice(0, 10) // Limit to 10 suggestions
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new YouTubeController();