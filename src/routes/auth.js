const express = require('express');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/google/signin', authController.googleSignIn);

// Protected routes (require authentication)
router.use(authenticateToken);

router.get('/profile', authController.getProfile);
router.post('/history', authController.addToWatchHistory);
router.get('/history', authController.getWatchHistory);
router.delete('/history', authController.clearWatchHistory);

module.exports = router;