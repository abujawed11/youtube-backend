const express = require('express');
const youtubeController = require('../controllers/youtubeController');

const router = express.Router();

// Search videos
router.get('/search', youtubeController.searchVideos);

// Get video details and streams
router.get('/video/:id', youtubeController.getVideo);

// Get search suggestions
router.get('/suggestions', youtubeController.getSearchSuggestions);

module.exports = router;