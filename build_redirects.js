const fs = require('fs');
const popularImages = require('./popular_images.json');

let redirects = '';

for (const key in popularImages) {
  const url = popularImages[key];
  const encodedUrl = encodeURIComponent(url);
  // 예: /.netlify/functions/placeholder/img/cat_image -> https://...
  redirects += `/.netlify/functions/placeholder/img/${key}  ${url}  302\n`;
}

fs.writeFileSync('_redirects', redirects);
console.log('Successfully created _redirects file.');
