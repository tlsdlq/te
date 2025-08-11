const sharp = require('sharp');
const { addCacheHeaders } = require('cdn-cache-control');

// 🛡️ 보안 및 성능 설정
const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'cdn.example.com',
  // 필요한 도메인 추가
];

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const TIMEOUT_MS = 25000;

// 🎨 기본값
const DEFAULTS = {
  width: 600,
  height: 400,
  bgColor: 'rgba(0,0,0,0.6)',
  textColor: '#FFFFFF',
  quality: 85
};

// 🔒 보안 검증
function isValidImageUrl(url) {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname === domain);
  } catch {
    return false;
  }
}

// 🖼️ 이미지 처리 (WebP 최적화)
async function processImage(url) {
  if (!isValidImageUrl(url)) {
    throw new Error('Unauthorized domain');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Netlify-Durable-Image/1.0' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > MAX_IMAGE_SIZE) throw new Error('Image too large');

    const imageBuffer = await response.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // 🎯 WebP 최적화 + 리사이징 (필요시)
    let processedImage = image;
    
    // 너무 큰 이미지는 리사이징
    if (width > 1920 || height > 1080) {
      processedImage = processedImage.resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      });
    }

    const optimizedBuffer = await processedImage
      .webp({ 
        quality: DEFAULTS.quality,
        effort: 6 // 최고 압축 효율
      })
      .toBuffer();

    return {
      buffer: optimizedBuffer,
      originalWidth: width,
      originalHeight: height,
      finalWidth: Math.min(width, 1920),
      finalHeight: Math.min(height, 1080)
    };

  } finally {
    clearTimeout(timeoutId);
  }
}

// 🎨 SVG 생성 함수
function generateSVG(options) {
  const {
    width,
    height,
    text = '',
    bgColor = DEFAULTS.bgColor,
    textColor = DEFAULTS.textColor,
    fontSize,
    backgroundImage = null,
    isError = false
  } = options;

  let backgroundContent;
  if (backgroundImage) {
    backgroundContent = `<image href="data:image/webp;base64,${backgroundImage}" x="0" y="0" width="${width}" height="${height}"/>`;
  } else {
    backgroundContent = `<rect width="100%" height="100%" fill="#e5e7eb"/>`;
  }

  let textContent = '';
  if (text) {
    const boxHeight = height * 0.25;
    const boxY = height - boxHeight;
    const textY = boxY + (boxHeight / 2);
    const padding = width * 0.03;
    const actualFontSize = fontSize || Math.max(16, Math.floor(width / 25));
    const textFill = isError ? '#ef4444' : textColor;
    
    textContent = `
      <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor}"/>
      <text x="${padding}" y="${textY}" 
            font-family="system-ui, Arial, sans-serif" 
            font-size="${actualFontSize}" 
            font-weight="600"
            fill="${textFill}" 
            text-anchor="start" 
            dominant-baseline="middle">
        ${text}
      </text>
    `;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <style>
        .text-shadow { filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.8)); }
      </style>
    </defs>
    ${backgroundContent}
    <g class="text-shadow">
      ${textContent}
    </g>
  </svg>`;
}

// 🔑 캐시 키 생성 (동일한 파라미터 = 동일한 캐시)
function generateCacheKey(params) {
  const { bgImg, text, bgColor, textColor, fontSize, width, height } = params;
  const keyData = {
    bgImg: bgImg || '',
    text: text || '',
    bgColor: bgColor || DEFAULTS.bgColor,
    textColor: textColor || DEFAULTS.textColor,
    fontSize: fontSize || 'auto',
    width: width || DEFAULTS.width,
    height: height || DEFAULTS.height
  };
  
  // 간단한 해시 생성
  return Buffer.from(JSON.stringify(keyData)).toString('base64').slice(0, 16);
}

// 🚀 메인 핸들러
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: 'Method not allowed'
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const {
      bgImg,
      text = '',
      bgColor,
      textColor,
      fontSize,
      width: customWidth,
      height: customHeight
    } = params;

    // 🔑 캐시 키로 요청 식별
    const cacheKey = generateCacheKey(params);
    console.log(`Processing request with cache key: ${cacheKey}`);

    let processedImage = null;
    let finalWidth = parseInt(customWidth) || DEFAULTS.width;
    let finalHeight = parseInt(customHeight) || DEFAULTS.height;
    let isError = false;

    // 🖼️ 배경 이미지 처리
    if (bgImg) {
      try {
        const result = await processImage(bgImg);
        processedImage = result.buffer.toString('base64');
        
        // 커스텀 크기가 없으면 원본 크기 사용
        if (!customWidth && !customHeight) {
          finalWidth = result.finalWidth;
          finalHeight = result.finalHeight;
        }
        
        console.log(`Background processed: ${finalWidth}x${finalHeight}`);
      } catch (error) {
        console.error('Background processing failed:', error.message);
        isError = true;
      }
    }

    // 🎨 최종 SVG 생성
    const svg = generateSVG({
      width: finalWidth,
      height: finalHeight,
      text: isError ? 'Image loading failed' : text,
      bgColor,
      textColor,
      fontSize: fontSize ? parseInt(fontSize) : null,
      backgroundImage: processedImage,
      isError
    });

    // 🔥 핵심: Durable Cache 헤더 설정
    let response = {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'X-Cache-Key': cacheKey, // 디버깅용
      },
      body: svg
    };

    // 🚀 cdn-cache-control 라이브러리로 Durable Cache 적용
    response = addCacheHeaders(response, {
      // 브라우저 캐시: 1년
      'Cache-Control': 'public, max-age=31536000, immutable',
      // 🔥 CDN + Durable Cache: 영구!
      'Netlify-CDN-Cache-Control': 'public, max-age=31536000, durable',
      // 캐시 태그 (무효화용)
      'Netlify-Cache-Tag': `image-${cacheKey}`,
    });

    console.log(`Response cached with durable flag: ${cacheKey}`);
    return response;

  } catch (error) {
    console.error('Handler error:', error);
    
    // 에러 상황에서도 기본 SVG 제공 (캐시하지 않음)
    const errorSvg = generateSVG({
      width: DEFAULTS.width,
      height: DEFAULTS.height,
      text: 'Service temporarily unavailable',
      isError: true
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache', // 에러는 캐시 안함
      },
      body: errorSvg
    };
  }
};
