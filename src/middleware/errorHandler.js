const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // YouTube API specific errors
  if (err.message.includes('API key')) {
    error = {
      message: 'YouTube API key is invalid or missing',
      status: 401
    };
  }

  // Rate limit errors
  if (err.message.includes('quota')) {
    error = {
      message: 'YouTube API quota exceeded. Please try again later.',
      status: 429
    };
  }

  // Video not available errors
  if (err.message.includes('Video unavailable')) {
    error = {
      message: 'Video is not available or has been removed',
      status: 404
    };
  }

  // Network errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    error = {
      message: 'Unable to connect to YouTube services',
      status: 503
    };
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;