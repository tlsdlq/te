// /netlify/functions/image-proxy.js

exports.handler = async function(event) {
  const { url } = event.queryStringParameters;

  if (!url) {
    return {
      statusCode: 400,
      body: 'Error: Image URL parameter is required.',
    };
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const imageResponse = await fetch(decodedUrl);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = 'public, max-age=31536000, s-maxage=31536000, immutable';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        // --- ✨ 핵심 추가: 모든 출처에서의 이미지 요청을 허용하는 헤더 ---
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Image proxy function error:', error);
    return {
      statusCode: 502,
      body: 'Error: Could not retrieve image from the source.',
    };
  }
};
