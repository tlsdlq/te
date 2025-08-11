const sharp = require('sharp');
const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { bgImg } = event.queryStringParameters;

  if (!bgImg) {
    return { statusCode: 400, body: 'Error: bgImg parameter is required.' };
  }

  try {
    const decodedUrl = decodeURIComponent(bgImg);
    const imageResponse = await fetch(decodedUrl);
    if (!imageResponse.ok) {
      throw new Error(`External image fetch failed: ${imageResponse.status}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    
    const optimizedBuffer = await sharp(Buffer.from(imageBuffer))
      .resize({
        width: 1200,
        withoutEnlargement: true
      })
      .webp({ 
        quality: 75,
      })
      .toBuffer();

    const finalMetadata = await sharp(optimizedBuffer).metadata();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'X-Image-Width': String(finalMetadata.width),
        'X-Image-Height': String(finalMetadata.height),
      },
      body: optimizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: `Error processing image: ${err.message}` };
  }
};
