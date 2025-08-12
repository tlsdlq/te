const fetch = require('node-fetch');
const imageSize = require('image-size');

function wrapText(text, maxWidth, fontSize) {
    const avgCharWidth = fontSize * 0.5;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    for (const word of words) {
        if (currentLine.length === 0) {
            currentLine = word;
        } else if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [''];
}

exports.handler = async function(event) {
    const { bgImg, text, bgColor, textColor, fontSize } = event.queryStringParameters;

    try {
        if (!bgImg) {
            throw new Error('bgImg parameter is required.');
        }

        const originalImageResponse = await fetch(decodeURIComponent(bgImg));
        if (!originalImageResponse.ok) {
            throw new Error(`Failed to fetch original image: ${originalImageResponse.status}`);
        }
        const imageBuffer = await originalImageResponse.buffer();

        const dimensions = imageSize(imageBuffer);
        const finalWidth = dimensions.width;
        const finalHeight = dimensions.height;
        
        if (!finalWidth || !finalHeight) {
            throw new Error('Could not determine image dimensions.');
        }

        const siteUrl = process.env.URL || 'https://cool-dusk-cb5c8e.netlify.app';
        // 1. 원본 Netlify 함수 이미지 URL을 생성합니다.
        const netlifyImageUrl = `${siteUrl}/.netlify/functions/optimized-bg?bgImg=${encodeURIComponent(bgImg)}`;

        // 2. 이미지 프록시 서비스 URL로 원본 URL을 감쌉니다.
        const proxyPrefix = 'https://images.weserv.nl/?url=';
        const proxiedImageUrl = `${proxyPrefix}${encodeURIComponent(netlifyImageUrl)}`;

        const boxHeight = finalHeight * 0.25;
        const boxY = finalHeight - boxHeight;
        const finalFontSize = fontSize ? parseInt(fontSize, 10) : Math.floor(finalWidth / 28);
        const textPaddingX = finalWidth * 0.03;
        const textMaxWidth = finalWidth - (textPaddingX * 2);
        const textLines = wrapText(text || '', textMaxWidth, finalFontSize);
        const lineHeight = finalFontSize * 1.2;
        const totalTextHeight = textLines.length * lineHeight;
        const textBlockStartY = boxY + (boxHeight - totalTextHeight) / 2;
        const textElements = textLines.map((line, index) => {
            const dy = index === 0 ? 0 : `${lineHeight}px`;
            return `<tspan x="${textPaddingX}" dy="${dy}">${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</tspan>`;
        }).join('');

        // 3. 최종 SVG의 <image> 태그에 프록시 처리된 URL을 사용합니다.
        const svg = `<svg width="${finalWidth}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg"><image href="${proxiedImageUrl}" x="0" y="0" width="100%" height="100%"/><rect x="0" y="${boxY}" width="100%" height="${boxHeight}" fill="${bgColor || 'rgba(0,0,0,0.5)'}" /><text x="${textPaddingX}" y="${textBlockStartY}" font-family="Arial, sans-serif" font-size="${finalFontSize}" fill="${textColor || '#FFFFFF'}" text-anchor="start" dominant-baseline="hanging">${textElements}</text></svg>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/svg+xml',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
            body: svg.trim(),
        };

    } catch (err) {
        const errorMessage = err.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const errorSvg = `<svg width="900" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8d7da" /><text x="15" y="35" font-family="monospace" font-size="14" fill="#721c24"><tspan x="15" dy="1.2em">AN ERROR OCCURRED:</tspan><tspan x="15" dy="1.5em">${errorMessage.substring(0, 80)}</tspan><tspan x="15" dy="1.2em">${errorMessage.substring(80, 160)}</tspan></text></svg>`;
        return { 
            statusCode: 500, 
            headers: { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' }, 
            body: errorSvg.trim() 
        };
    }
};
