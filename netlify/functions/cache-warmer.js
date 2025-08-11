const fetch = require('node-fetch');

const TARGET_URLS = [
  "/.netlify/functions/placeholder?text=Welcome+to+my+Site&bgImg=https://.../main-background.jpg",
  "/.netlify/functions/placeholder?text=Most+Popular+Article&bgImg=https://.../popular-post.jpg",
];

exports.handler = async function() {
  const siteUrl = process.env.DEPLOY_PRIME_URL || 'https://your-site-url.netlify.app';

  console.log(`Warming up ${TARGET_URLS.length} URLs...`);

  const requests = TARGET_URLS.map(path => {
    const url = `${siteUrl}${path}`;
    console.log(`Pinging: ${url}`);
    return fetch(url).then(res => {
      if (!res.ok) {
        console.error(`Failed to warm up ${url}: ${res.status}`);
      }
    }).catch(err => {
      console.error(`Error pinging ${url}:`, err);
    });
  });

  await Promise.all(requests);

  console.log('Cache warming complete.');
  
  return {
    statusCode: 200,
    body: 'Cache warming process finished.',
  };
};
