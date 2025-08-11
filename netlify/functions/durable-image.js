// te/netlify/functions/durable-image.js

const sharp = require('sharp');

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

// 🔒 보안 검증 (모든 도메인을 허용하도록 수정됨)
function isValidImageUrl(url) {
  // 경고: 모든 도메인을 허용하는 것은 보안상 위험할 수 있습니다.
  // URL 형식이 올바른지 기본적인 확인만 수행합니다.
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// 🔑 배경이미지만을 위한 별도 캐시 키 생성
function generateImageCacheKey(url, width, height) {
  const keyData = {
    url: url,
    w: width || 'auto',
    h: height || 'auto'
  };
  return 'img-' + Buffer.from(JSON.stringify(keyData)).toString('base64').slice(0, 12);
}

// 🔑 최종 결과물을 위한 캐시 키 생성
function generateFinalCacheKey(params) {
  const { bgImg, text, bgColor, textColor, fontSize, width, height } = params;
  const keyData = {
    bg: bgImg ? generateImageCacheKey(bgImg, width, height) : '',
    text: text || '',
    bgColor: bgColor || DEFAULTS.bgColor,
    textColor: textColor || DEFAULTS.textColor,
    fontSize: fontSize || 'auto',
    width: width || DEFAULTS.width,
    height: height || DEFAULTS.height
  };
  
  return 'final-' + Buffer.from(JSON.stringify(keyData)).toString('base64').slice(0, 12);
}

// 🖼️ 배경이미지 처리 및 WebP 최적화
async function processBackgroundImage(url, targetWidth, targetHeight) {
  if (!isValidImageUrl(url)) {
    // 이 오류는 이제 유효하지 않은 URL 형식일 때만 발생합니다.
    throw new Error('Invalid image URL format');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(`Downloading background image: ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 
        'User-Agent': 'Netlify-Durable-Image/1.0',
        'Accept': 'image/*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > MAX_IMAGE_SIZE) {
      throw new Error('Image too large');
    }

    const imageBuffer = await response.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    
    const metadata = await image.metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    // 🎯 타겟 크기 결정
    let finalWidth = targetWidth || metadata.width;
    let finalHeight = targetHeight || metadata.height;

    // 너무 큰 이미지는 리사이징 (최대 1920x1080)
    if (finalWidth > 1920 || finalHeight > 1080) {
      const ratio = Math.min(1920 / finalWidth, 1080 / finalHeight);
      finalWidth = Math.floor(finalWidth * ratio);
      finalHeight = Math.floor(finalHeight * ratio);
    }

    // 🚀 WebP 최적화 처리
    const optimizedBuffer = await image
      .resize(finalWidth, finalHeight, { 
        fit: 'cover',
        position: 'centre'
      })
      .webp({ 
        quality: DEFAULTS.quality,
        effort: 6
      })
      .toBuffer();

    console.log(`Processed image: ${finalWidth}x${finalHeight}, size: ${optimizedBuffer.length} bytes`);

    return {
      buffer: optimizedBuffer,
      width: finalWidth,
      height: finalHeight,
      base64: optimizedBuffer.toString('base64')
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
    backgroundImageBase64 = null,
    isError = false
  } = options;

  // 배경 처리
  let backgroundContent;
  if (backgroundImageBase64) {
    backgroundContent = `
      <defs>
        <pattern id="bgImage" patternUnits="userSpaceOnUse" width="${width}" height="${height}">
          <image href="data:image/webp;base64,${backgroundImageBase64}" 
                 x="0" y="0" width="${width}" height="${height}"
                 preserveAspectRatio="xMidYMid slice"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgImage)"/>`;
  } else {
    backgroundContent = `<rect width="100%" height="100%" fill="#f3f4f6"/>`;
  }

  // 텍스트 오버레이 처리
  let textContent = '';
  if (text) {
    const boxHeight = Math.max(60, height * 0.15);
    const boxY = height - boxHeight;
    const textY = boxY + (boxHeight / 2) + 5;
    const padding = Math.max(20, width * 0.03);
    const actualFontSize = fontSize || Math.max(16, Math.floor(width / 30));
    const textFill = isError ? '#ef4444' : textColor;
    
    // 텍스트 길이에 따른 자동 줄바꿈 처리
    const maxCharsPerLine = Math.floor((width - padding * 2) / (actualFontSize * 0.6));
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length <= maxCharsPerLine) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    const lineHeight = actualFontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    const startY = textY - (totalTextHeight / 2) + (lineHeight / 2);
    
    const textElements = lines.map((line, index) => 
      `<text x="${padding}" y="${startY + index * lineHeight}" 
             font-family="system-ui, 'Segoe UI', Arial, sans-serif" 
             font-size="${actualFontSize}" 
             font-weight="600"
             fill="${textFill}" 
             text-anchor="start" 
             dominant-baseline="middle">
        ${line}
      </text>`
    ).join('');

    textContent = `
      <rect x="0" y="${boxY}" width="100%" height="${boxHeight}" 
            fill="${bgColor}" opacity="0.85"/>
      <g class="text-shadow">
        ${textElements}
      </g>
    `;
  }

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <defs>
      <style>
        .text-shadow { 
          filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8)); 
        }
      </style>
    </defs>
    ${backgroundContent}
    ${textContent}
  </svg>`;
}

// 🚀 메인 핸들러
exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
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

    // 🔑 캐시 키들 생성
    const finalCacheKey = generateFinalCacheKey(params);
    const imageCacheKey = bgImg ? generateImageCacheKey(bgImg, customWidth, customHeight) : null;
    
    console.log(`Processing request - Final cache key: ${finalCacheKey}`);
    if (imageCacheKey) {
      console.log(`Background image cache key: ${imageCacheKey}`);
    }

    let processedImage = null;
    let finalWidth = parseInt(customWidth) || DEFAULTS.width;
    let finalHeight = parseInt(customHeight) || DEFAULTS.height;
    let isError = false;

    // 🖼️ 배경 이미지 처리 (별도 캐싱됨)
    if (bgImg) {
      try {
        const result = await processBackgroundImage(bgImg, finalWidth, finalHeight);
        processedImage = result.base64;
        
        // 커스텀 크기가 없으면 처리된 이미지 크기 사용
        if (!customWidth && !customHeight) {
          finalWidth = result.width;
          finalHeight = result.height;
        }
        
        console.log(`Background processed successfully: ${finalWidth}x${finalHeight}`);
      } catch (error) {
        console.error('Background processing failed:', error.message);
        isError = true;
      }
    }

    // 🎨 최종 SVG 생성
    const svg = generateSVG({
      width: finalWidth,
      height: finalHeight,
      text: isError ? `❌ Image loading failed: ${bgImg}` : text,
      bgColor,
      textColor,
      fontSize: fontSize ? parseInt(fontSize) : null,
      backgroundImageBase64: processedImage,
      isError
    });

    // 🔥 Durable Cache 헤더 설정
 
