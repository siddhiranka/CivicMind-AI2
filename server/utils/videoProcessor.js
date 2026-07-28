// src/utils/videoProcessor.js
// Extracts N key frames from a video buffer using fluent-ffmpeg and returns an array of Buffer objects (JPEG format).
// Requires ffmpeg to be installed on the system and fluent-ffmpeg npm package.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');

/**
 * Write a video buffer to a temporary file.
 * @param {Buffer} videoBuffer
 * @returns {Promise<string>} absolute path to temporary video file
 */
function writeTempVideo(videoBuffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.join(os.tmpdir(), 'civicmind_video');
    fs.mkdirSync(tmpDir, { recursive: true });
    const fileName = `video_${crypto.randomBytes(6).toString('hex')}.mp4`;
    const filePath = path.join(tmpDir, fileName);
    fs.writeFile(filePath, videoBuffer, err => {
      if (err) return reject(err);
      resolve(filePath);
    });
  });
}

/**
 * Extract key frames from a video file.
 * @param {string} videoPath absolute path to video file
 * @param {number} frameCount number of frames to extract (default 5)
 * @returns {Promise<Buffer[]>} array of image buffers (PNG)
 */
function extractKeyFrames(videoPath, frameCount = 5) {
  return new Promise((resolve, reject) => {
    // Determine video duration via ffprobe
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata.format.duration;
      // Compute timestamps evenly spaced
      const interval = duration / (frameCount + 1);
      const timestamps = [];
      for (let i = 1; i <= frameCount; i++) {
        timestamps.push((interval * i).toFixed(2));
      }
      const frames = [];
      const tmpDir = path.join(os.tmpdir(), 'civicmind_frames');
      fs.mkdirSync(tmpDir, { recursive: true });
      let processed = 0;
      timestamps.forEach((ts, idx) => {
        const outPath = path.join(tmpDir, `frame_${idx}_${crypto.randomBytes(4).toString('hex')}.png`);
        ffmpeg(videoPath)
          .screenshots({ timestamps: [ts], filename: path.basename(outPath), folder: tmpDir, size: '640x?' })
          .on('end', () => {
            fs.readFile(outPath, (readErr, data) => {
              if (readErr) return reject(readErr);
              frames[idx] = data; // preserve order
              processed++;
              if (processed === timestamps.length) {
                resolve(frames);
              }
            });
          })
          .on('error', reject);
      });
    });
  });
}

module.exports = { writeTempVideo, extractKeyFrames };
