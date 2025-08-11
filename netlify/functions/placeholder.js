const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { text = '', bgImg, bgColor, textColor, fontSize } = event.queryStringParameters;

  let backgroundContent = '';
  let errorText = '';
  let finalWidth, finalHeight; 

  if (bgImg) {
    try {
      const siteUrl = process.env.DEPLOY_PRIME_URL || process.env.URL || 'https://your-site-url.netlify.app';
      const bgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

      const imageResponse = await fetch(bgUrl);
      if (!imageResponse.ok) {
        throw new Error(`Optimized BG fetch failed with status: ${imageResponse.status}`);
      }
      
      finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
      finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
      
      const imageBase64 = await imageResponse.text();
      
      backgroundContent = `<image href="data:image/webp;base64,${imageBase64}" x="0" y="0" width="${finalWidth}" height="${finalHeight}"/>`;

    } catch (err) {
      finalWidth = 1200;
      finalHeight = 630;
      errorText = 'Image Load Error!';
      backgroundContent = `<rect width="100%" height="100%" fill="#ccc" />`;
      console.error(err);
    }
  } else {
    finalWidth = 1200;
    finalHeight = 630;
    backgroundContent = `<rect width="100%" height="100%" fill="#cccccc" />`;
  }
  
  const boxHeight = finalHeight * 0.25;
  const boxY = finalHeight - boxHeight;
  const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
  const textPaddingX = finalWidth * 0.03;
  const textY = boxY + (boxHeight / 2);

  const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${backgroundContent}${text || errorText ? `<rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${errorText || text}</text>` : ''}</svg>`;

  return {
    statusCode: 200,
    headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable'
    },
    body: svg,
  };
};
});
