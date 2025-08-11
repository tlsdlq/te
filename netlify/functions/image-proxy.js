// /netlify/functions/image-proxy.js - 최종 디버깅 버전

exports.handler = async function(event) {
  // ✨ 어떤 경우에도 CORS 헤더를 반환하도록 미리 정의
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  };

  const { url } = event.queryStringParameters;

  if (!url) {
    return {
      statusCode: 400,
      headers: corsHeaders, // 실패 시에도 CORS 헤더 포함
      body: 'Error: Image URL parameter is required.',
    };
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    console.log(`Attempting to fetch: ${decodedUrl}`); // 어떤 URL을 가져오는지 로그 추가

    const imageResponse = await fetch(decodedUrl);

    if (!imageResponse.ok) {
      // 원본 서버가 에러를 반환했음을 명확히 로그로 남김
      console.error(`Upstream error: ${imageResponse.status} ${imageResponse.statusText} for URL: ${decodedUrl}`);
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';
    const cacheControl = 'public, max-age=31536000, s-maxage=31536000, immutable';

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders, // 성공 시에도 CORS 헤더 포함
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Image proxy function catch block error:', error);
    return {
      statusCode: 502, // Bad Gateway
      headers: corsHeaders, // 최종 실패 시에도 CORS 헤더 포함
      body: `Error: Could not retrieve image from the source. Reason: ${error.message}`,
    };
  }
};
