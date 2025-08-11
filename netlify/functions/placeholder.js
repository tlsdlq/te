const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

  if (!bgImg) {
    const defaultSvg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ccc" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#555">bgImg parameter is required.</text></svg>`;
    return { statusCode: 400, headers: { 'Content-Type': 'image/svg+xml' }, body: defaultSvg };
  }

  try {
    const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
    const optimizedBgUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

    const imageResponse = await fetch(optimizedBgUrl);
    if (!imageResponse.ok) throw new Error('Optimized BG metadata fetch failed');
    
    const finalWidth = parseInt(imageResponse.headers.get('x-image-width'), 10);
    const finalHeight = parseInt(imageResponse.headers.get('x-image-height'), 10);
    
    const boxHeight = finalHeight * 0.25;
    const boxY = finalHeight - boxHeight;
    const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
    const textPaddingX = finalWidth * 0.03;
    const textY = boxY + (boxHeight / 2);

    const svg = `
<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
    <image href="${optimizedBgUrl}" x="0" y="0" width="100%" height="100%"/>
    <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" />
    <text x="${textPaddingX}" y="${textY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="middle">${text || ''}</text>
</svg>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300, s-maxage=300', 
      },
      body: svg.trim(),
    };

  } catch (err) {
    const errorSvg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="#721c24">Error creating image.</text></svg>`;
    return { statusCode: 500, headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, body: errorSvg };
  }
};
