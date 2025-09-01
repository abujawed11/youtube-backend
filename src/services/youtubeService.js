const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  // Search for videos
  async searchVideos(query, maxResults = 20, pageToken = null) {
    try {
      const url = `${this.baseURL}/search`;
      const params = {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults,
        key: this.apiKey,
        order: 'relevance',
        videoEmbeddable: 'true',
        videoSyndicated: 'true'
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await axios.get(url, { params });
      
      // Get additional video details
      const videoIds = response.data.items.map(item => item.id.videoId).join(',');
      const videoDetails = await this.getVideoDetails(videoIds);

      return {
        items: response.data.items.map(item => {
          const details = videoDetails.find(detail => detail.id === item.id.videoId);
          return {
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            duration: details?.duration || 'Unknown',
            viewCount: details?.viewCount || '0'
          };
        }),
        nextPageToken: response.data.nextPageToken,
        totalResults: response.data.pageInfo.totalResults
      };
    } catch (error) {
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  // Get video details including duration and view count
  async getVideoDetails(videoIds) {
    try {
      const url = `${this.baseURL}/videos`;
      const response = await axios.get(url, {
        params: {
          part: 'contentDetails,statistics',
          id: videoIds,
          key: this.apiKey
        }
      });

      return response.data.items.map(item => ({
        id: item.id,
        duration: this.parseDuration(item.contentDetails.duration),
        viewCount: item.statistics.viewCount
      }));
    } catch (error) {
      throw new Error(`Failed to get video details: ${error.message}`);
    }
  }

  // Get video stream URLs
  async getVideoStreams(videoId) {
    try {
      const videoURL = `https://www.youtube.com/watch?v=${videoId}`;
      
      // Configure ytdl with agent and options for better reliability
      const agent = ytdl.createAgent();
      const options = {
        agent,
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      };
      
      // Check if video is available
      const info = await ytdl.getInfo(videoURL, options);
      
      if (info.videoDetails.isLiveContent) {
        throw new Error('Live streams are not supported');
      }
      
      // Get available formats
      let formats = info.formats || [];
      
      // Filter for formats with both video and audio
      let videoAndAudioFormats = formats.filter(format => 
        format.hasVideo && format.hasAudio && format.url
      );
      
      // If no combined formats, try video-only formats (fallback)
      if (videoAndAudioFormats.length === 0) {
        videoAndAudioFormats = formats.filter(format => 
          format.hasVideo && format.url
        );
      }
      
      // If still no formats, try any available format
      if (videoAndAudioFormats.length === 0) {
        videoAndAudioFormats = formats.filter(format => format.url);
      }
      
      if (videoAndAudioFormats.length === 0) {
        throw new Error('No playable video formats found');
      }
      
      // Remove duplicates and sort by quality (highest first)
      const uniqueFormats = new Map();
      
      videoAndAudioFormats.forEach(format => {
        const qualityKey = format.qualityLabel || `${format.height}p` || 'Audio';
        const quality = format.height || format.audioBitrate || 0;
        
        // Only keep the best format for each quality level
        if (!uniqueFormats.has(qualityKey) || quality > (uniqueFormats.get(qualityKey).quality || 0)) {
          uniqueFormats.set(qualityKey, {
            quality: qualityKey,
            url: format.url,
            mimeType: format.mimeType,
            bitrate: format.bitrate,
            fps: format.fps,
            hasVideo: format.hasVideo,
            hasAudio: format.hasAudio,
            qualityScore: quality
          });
        }
      });

      const sortedFormats = Array.from(uniqueFormats.values())
        .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
        .map(({ qualityScore, ...format }) => format)
        .slice(0, 6); // Limit to 6 unique formats

      return {
        title: info.videoDetails.title,
        description: info.videoDetails.description,
        duration: info.videoDetails.lengthSeconds,
        thumbnail: info.videoDetails.thumbnails?.[0]?.url,
        formats: sortedFormats
      };
      
    } catch (error) {
      console.error('Video stream extraction error:', error.message);
      
      // If ytdl fails, try to provide basic video info from YouTube API
      try {
        const videoDetails = await this.getVideoDetails(videoId);
        if (videoDetails.length > 0) {
          const video = videoDetails[0];
          // Return a fallback response indicating the video exists but streams aren't available
          return {
            title: `Video: ${videoId}`,
            description: 'Video streams temporarily unavailable. Please try again later.',
            duration: video.duration || 'Unknown',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            formats: []
          };
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError.message);
      }
      
      throw new Error(`Failed to get video streams: ${error.message}`);
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query) {
    try {
      // Using YouTube's autocomplete API
      const url = 'http://suggestqueries.google.com/complete/search';
      const response = await axios.get(url, {
        params: {
          client: 'youtube',
          ds: 'yt',
          q: query
        }
      });

      // Parse JSONP response
      const jsonStr = response.data.substring(
        response.data.indexOf('(') + 1,
        response.data.lastIndexOf(')')
      );
      const suggestions = JSON.parse(jsonStr);
      
      return suggestions[1].map(item => item[0]);
    } catch (error) {
      return []; // Return empty array if suggestions fail
    }
  }

  // Helper method to parse ISO 8601 duration
  parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 'Unknown';

    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');

    let result = '';
    if (hours) result += `${hours}:`;
    result += `${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    
    return result;
  }
}

module.exports = new YouTubeService();