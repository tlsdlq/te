const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { url } = event.queryStringParameters;
  if (!url) {
    return { statusCode: 400, body: 'Error: url parameter is required.' };
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const imageResponse = await fetch(decodedUrl);
    if (!imageResponse.ok) { 
        throw new Error(`Fetch failed: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};
