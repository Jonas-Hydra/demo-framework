/**
 * Simple icon generator script
 * Run with: node scripts/create-icons.js
 *
 * This creates simple placeholder PNG icons for development.
 * For production, use the generate-icons.html file in a browser
 * to create proper icons, or use a design tool.
 */

const fs = require('fs');
const path = require('path');

// Simple 1x1 purple pixel PNG (base64)
// This is a minimal valid PNG that can serve as a placeholder
const minimalPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Icon sizes needed for Chrome extension
const sizes = [16, 32, 48, 128];

const iconsDir = path.join(__dirname, '..', 'assets', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create placeholder PNG files
sizes.forEach(size => {
  const filename = path.join(iconsDir, `icon${size}.png`);

  // Only create if doesn't exist
  if (!fs.existsSync(filename)) {
    fs.writeFileSync(filename, minimalPng);
    console.log(`Created placeholder: icon${size}.png`);
  } else {
    console.log(`Skipped (exists): icon${size}.png`);
  }
});

console.log('\nPlaceholder icons created!');
console.log('For proper icons, open scripts/generate-icons.html in a browser');
console.log('and download the generated PNG files to assets/icons/');
