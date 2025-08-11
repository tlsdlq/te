// netlify/functions/image-proxy.js

const fetch = require('node-fetch');

exports.handler = async function(event) {
  const { url } = event.queryStringParameters;
  if (!url) {
    return { statusCode: 400, body: 'Error: url parameter is required.' };
  }

  try {
    const decodedUrl = decodeURIComponent(url);

    // ✨ --- 여기가 핵심입니다 --- ✨
    // fetch 요청에 일반 브라우저의 User-Agent 헤더를 추가합니다.
    const fetchOptions = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    };

    const imageResponse = await fetch(decodedUrl, fetchOptions); // 수정된 fetch 호출

    if (!imageResponse.ok) { 
        throw new Error(`Fetch failed: ${imageResponse.status} ${imageResponse.statusText}`);
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
    // 에러 내용을 body에 담아주면 디버깅에 더 용이합니다.
    return { statusCode: 500, body: `Proxy Error: ${error.message}` };
  }
};
