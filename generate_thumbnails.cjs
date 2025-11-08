// generate_thumbnails.js
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

// Define paths
const videoDir = path.join(__dirname, 'public/videos');
const thumbnailDir = path.join(__dirname, 'public/thumbnails');

// Ensure thumbnails folder exists
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Process each video file
fs.readdirSync(videoDir)
  .filter(file => file.endsWith('.mp4'))
  .forEach(file => {
    const videoPath = path.join(videoDir, file);
    const baseName = path.parse(file).name;
    const thumbPath = path.join(thumbnailDir, `${baseName}.jpg`);

    // Skip if thumbnail already exists
    if (fs.existsSync(thumbPath)) {
      console.log(`✅ Skipped: ${baseName}.jpg already exists.`);
      return;
    }

    // Generate thumbnail at 5 seconds
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['5'],
        filename: `${baseName}.jpg`,
        folder: thumbnailDir,
        size: '320x180' // 16:9 ratio
      })
      .on('end', () => console.log(`📸 Created: ${baseName}.jpg`))
      .on('error', err => console.error(`❌ Error for ${file}:`, err));
  });
