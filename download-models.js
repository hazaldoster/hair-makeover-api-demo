const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const modelsDir = path.join(__dirname, 'public', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    const handleResponse = (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`Redirected to: ${redirectUrl}`);
        
        // Follow the redirect
        const protocol = redirectUrl.startsWith('https') ? https : http;
        protocol.get(redirectUrl, handleResponse).on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${dest}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, handleResponse).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

// Raw CDN URLs for the models
const modelFiles = [
  // SSD MobileNet model
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2',
  
  // Face landmark model
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
];

async function downloadModels() {
  try {
    for (const url of modelFiles) {
      const fileName = path.basename(url);
      const destPath = path.join(modelsDir, fileName);
      await downloadFile(url, destPath);
    }
    
    console.log('All model files downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
    process.exit(1);
  }
}

downloadModels(); 