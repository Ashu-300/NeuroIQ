/**
 * Script to download face-api.js models
 * Run: node scripts/downloadModels.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '../models');

// Models to download from face-api CDN
const MODELS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
];

const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

function downloadFile(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(MODELS_DIR, filename);
    const file = fs.createWriteStream(filePath);

    https.get(BASE_URL + filename, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded: ${filename}`);
            resolve();
          });
        }).on('error', reject);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete incomplete file
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('Creating models directory...');
  
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  console.log('Downloading face-api.js models...\n');

  for (const model of MODELS) {
    try {
      await downloadFile(model);
    } catch (err) {
      console.error(`Failed to download ${model}:`, err.message);
    }
  }

  console.log('\nModels download complete!');
}

downloadModels();
