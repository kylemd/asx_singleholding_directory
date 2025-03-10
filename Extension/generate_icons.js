/**
 * This script helps generate PNG icons from the SVG file.
 * 
 * To use this script:
 * 1. Install the required dependencies:
 *    npm install sharp
 * 
 * 2. Run the script:
 *    node generate_icons.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 48, 128];
const svgPath = path.join(__dirname, 'images', 'icon.svg');

async function generateIcons() {
  try {
    console.log('Reading SVG file...');
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const size of sizes) {
      console.log(`Generating ${size}x${size} icon...`);
      const outputPath = path.join(__dirname, 'images', `icon${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Created: ${outputPath}`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 