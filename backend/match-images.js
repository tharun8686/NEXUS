// backend/match-images.js
const fs = require('fs');
const path = require('path');

// Adjusted paths assuming this script runs from the /backend folder
const IMAGE_BASE_DIR = path.join(__dirname, '../frontend/public/images/products');
const SQL_INPUT_PATH = path.join(__dirname, 'db/seed_products.sql');
const SQL_OUTPUT_PATH = path.join(__dirname, 'db/seed_products_fixed.sql');

function getKeywords(str) {
  return new Set(
    str.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(' ')
      .filter(word => word.length > 1)
  );
}

function calculateMatchScore(productName, fileName) {
  const productKeywords = getKeywords(productName);
  const fileKeywords = getKeywords(fileName.split('.')[0]);

  let matches = 0;
  productKeywords.forEach(word => {
    if (fileKeywords.has(word)) matches++;
  });

  return matches;
}

function findBestImage(productName, category) {
  const dirPath = path.join(IMAGE_BASE_DIR, category.toLowerCase());
  
  if (!fs.existsSync(dirPath)) return null;

  const files = fs.readdirSync(dirPath);
  let bestMatch = null;
  let highestScore = 0;

  files.forEach(file => {
    if (!/\.(jpg|jpeg|png|webp|avif)$/i.test(file)) return;

    const score = calculateMatchScore(productName, file);
    const brand = productName.split(' ')[0].toLowerCase();
    const finalScore = file.toLowerCase().includes(brand) ? score + 1.5 : score;

    if (finalScore > highestScore) {
      highestScore = finalScore;
      bestMatch = file;
    }
  });

  return bestMatch ? `/images/products/${category.toLowerCase()}/${bestMatch}` : null;
}

// ── NEW: Read and modify the SQL file ──────────────────────────────
function processSeedFile() {
  if (!fs.existsSync(SQL_INPUT_PATH)) {
    console.error(`❌ Could not find ${SQL_INPUT_PATH}`);
    return;
  }

  console.log('🔍 Scanning seed_products.sql and auto-matching local images...');
  const sqlContent = fs.readFileSync(SQL_INPUT_PATH, 'utf-8');
  const lines = sqlContent.split('\n');
  let updatedLines = [];
  let matchCount = 0;

  for (let line of lines) {
    // If the line is a product insertion tuple e.g., ('iPhone...', 'Apple', 'Mobile'...
    if (line.trim().startsWith("('")) {
      // Safely extract the Name (1st string) and Category (3rd string)
      const match = line.match(/\('([^']+)',\s*'([^']+)',\s*'([^']+)'/);
      
      if (match) {
        const productName = match[1];
        const category = match[3];
        const bestImage = findBestImage(productName, category);

        if (bestImage) {
          // Replace the old '/images/products/...' path with the newly matched path
          line = line.replace(/(,\s*)'\/images\/products\/[^']+'/, `$1'${bestImage}'`);
          matchCount++;
        }
      }
    }
    updatedLines.push(line);
  }

  // Save the fixed SQL to a new file so we don't destroy the original template
  fs.writeFileSync(SQL_OUTPUT_PATH, updatedLines.join('\n'));
  console.log(`✅ Successfully mapped ${matchCount} images! Generated seed_products_fixed.sql`);
}

processSeedFile();