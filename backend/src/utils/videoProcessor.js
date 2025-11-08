const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Check if FFmpeg is available (returns Promise)
const checkFFmpeg = () => {
  return new Promise((resolve) => {
    try {
      ffmpeg.getAvailableFormats((err) => {
        if (err) {
          logger.warn('FFmpeg is not installed or not available:', err.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (error) {
      logger.warn('FFmpeg check failed:', error.message);
      resolve(false);
    }
  });
};

// Resolution settings for different qualities
const RESOLUTION_CONFIG = {
  '360p': { width: 640, height: 360, videoBitrate: '500k', audioBitrate: '128k' },
  '480p': { width: 854, height: 480, videoBitrate: '1000k', audioBitrate: '128k' },
  '720p': { width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '192k' },
  '1080p': { width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '256k' }
};

/**
 * Process video to create multiple resolutions
 * @param {string} inputFilePath - Path to the original video file
 * @param {string} outputDir - Directory to save processed videos
 * @param {string} baseFilename - Base filename without extension
 * @returns {Promise<Array>} Array of video variants with quality, url, and fileSize
 */
const processVideoResolutions = async (inputFilePath, outputDir, baseFilename) => {
  // Check if input file exists
  if (!fs.existsSync(inputFilePath)) {
    throw new Error(`Input video file not found: ${inputFilePath}`);
  }

  // Check if FFmpeg is available
  let ffmpegAvailable = false;
  try {
    // Try to get FFmpeg version
    await new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    ffmpegAvailable = true;
  } catch (error) {
    logger.warn('FFmpeg is not available, will only save original video:', error.message);
    // Return original video only
    const originalStats = fs.statSync(inputFilePath);
    return [{
      quality: '720p',
      url: `/uploads/videos/${path.basename(inputFilePath)}`,
      fileSize: originalStats.size
    }];
  }

  if (!ffmpegAvailable) {
    // FFmpeg not available, return original only
    const originalStats = fs.statSync(inputFilePath);
    return [{
      quality: '720p',
      url: `/uploads/videos/${path.basename(inputFilePath)}`,
      fileSize: originalStats.size
    }];
  }

  const variants = [];
  const resolutions = ['360p', '480p', '720p', '1080p'];

  // Determine source resolution to avoid upscaling
  let sourceResolution = null;
  try {
    sourceResolution = await getVideoResolution(inputFilePath);
  } catch (error) {
    logger.warn('Could not determine source resolution:', error);
  }

  // Process each resolution
  for (const quality of resolutions) {
    const config = RESOLUTION_CONFIG[quality];
    
    // Skip if source is smaller than target (no upscaling)
    if (sourceResolution && sourceResolution.height < config.height) {
      logger.debug(`Skipping ${quality} - source resolution (${sourceResolution.height}p) is smaller`);
      continue;
    }

    const outputFilename = `${baseFilename}-${quality}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    try {
      await new Promise((resolve, reject) => {
        // Preserve aspect ratio and orientation; do not pad to landscape for vertical videos
        const scaleFilter = `scale='min(${config.width},iw)':'min(${config.height},ih)':force_original_aspect_ratio=decrease`;
        ffmpeg(inputFilePath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-movflags +faststart',
            '-pix_fmt yuv420p',
            '-preset veryfast',
            '-crf 23'
          ])
          .videoBitrate(config.videoBitrate)
          .audioBitrate(config.audioBitrate)
          .format('mp4')
          .videoFilter(scaleFilter)
          .on('start', (commandLine) => {
            logger.debug(`Processing ${quality}: ${commandLine}`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              logger.debug(`Processing ${quality}: ${Math.round(progress.percent)}% done`);
            }
          })
          .on('end', () => {
            logger.debug(`Finished processing ${quality}`);
            resolve();
          })
          .on('error', (err) => {
            logger.error(`Error processing ${quality}:`, err.message);
            reject(err);
          })
          .save(outputPath);
      });

      // Get file size
      const stats = fs.statSync(outputPath);
      variants.push({
        quality: quality,
        url: `/uploads/videos/${outputFilename}`,
        fileSize: stats.size
      });

      logger.info(`Successfully created ${quality} variant: ${outputFilename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      logger.warn(`Failed to create ${quality} variant:`, error.message);
      // Continue with other resolutions even if one fails
    }
  }

  // If no variants were created, return original
  if (variants.length === 0) {
    const originalStats = fs.statSync(inputFilePath);
    variants.push({
      quality: '720p',
      url: `/uploads/videos/${path.basename(inputFilePath)}`,
      fileSize: originalStats.size
    });
  }

  return variants;
};

/**
 * Get video resolution
 */
const getVideoResolution = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        width: videoStream.width,
        height: videoStream.height
      });
    });
  });
};

module.exports = {
  processVideoResolutions,
  checkFFmpeg,
  getVideoResolution
};

