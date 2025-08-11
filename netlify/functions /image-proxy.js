// /netlify/functions/image-proxy.js (이전과 동일)
exports.handler = async function(event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  };
  const { url } = event.queryStringParameters;
  if (!url) { /* ... */ }
  try {
    const decodedUrl = decodeURIComponent(url);
    const imageResponse = await fetch(decodedUrl);
    if (!imageResponse.ok) { throw new Error(/* ... */); }
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) { /* ... */ }
};
