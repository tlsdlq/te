// /netlify/functions/image-proxy.js

/**
 * 외부 이미지 URL을 받아서 Netlify CDN에 오랫동안 캐시하는 프록시 함수입니다.
 * 동일한 이미지 요청이 들어오면 원본을 다시 다운로드하지 않고 CDN 캐시를 반환하여
 * 대역폭을 획기적으로 절약합니다.
 */
exports.handler = async function(event) {
  // 쿼리 파라미터에서 이미지 URL을 가져옵니다. URL은 인코딩되어 전달됩니다.
  const { url } = event.queryStringParameters;

  if (!url) {
    return {
      statusCode: 400,
      body: 'Error: Image URL parameter is required.',
    };
  }

  try {
    // 인코딩된 URL을 디코딩하여 실제 이미지 주소를 가져옵니다.
    const decodedUrl = decodeURIComponent(url);
    const imageResponse = await fetch(decodedUrl);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'application/octet-stream';

    // --- ✨ 핵심: 캐시 헤더 설정 ✨ ---
    // s-maxage: 공유 캐시(CDN)의 캐시 유효 기간 (1년)
    // max-age: 브라우저 캐시의 유효 기간 (1년)
    // immutable: 내용이 절대 변하지 않음을 알려 브라우저가 불필요한 재검증 요청을 보내지 않도록 합니다.
    const cacheControl = 'public, max-age=31536000, s-maxage=31536000, immutable';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
      // 이미지를 Base64로 인코딩하여 응답 본문에 담습니다.
      body: Buffer.from(imageBuffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Image proxy function error:', error);
    return {
      statusCode: 502, // Bad Gateway: 업스트림 서버(원본 이미지 서버)에서 잘못된 응답을 받았음을 의미
      body: 'Error: Could not retrieve image from the source.',
    };
  }
};
