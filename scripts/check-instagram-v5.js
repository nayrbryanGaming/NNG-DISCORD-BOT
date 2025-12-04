const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/last-posts.json');
const config = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

let lastPosts = {};
try {
  if (fs.existsSync(DATA_FILE)) lastPosts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {}

console.log('🚀 Instagram Checker v5 (Direct HTML Scrape)');
console.log('⏰', new Date().toISOString(), '\n');

async function checkInstagram(username, webhookUrl) {
  console.log(`📱 Checking @${username}...`);
  
  try {
    // Try direct Instagram profile page with mobile user-agent
    const url = `https://www.instagram.com/${username}/`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    });

    const html = response.data;
    
    // Extract post data from JSON embedded in HTML
    const jsonMatch = html.match(/<script type="application\/ld\+json">({.*?"@type":"ImageObject".*?})<\/script>/);
    
    if (!jsonMatch) {
      console.log(`⚠️ No posts found\n`);
      return;
    }

    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      const imageUrl = jsonData.image || jsonData.url;
      const description = jsonData.description || `New post from @${username}`;
      const datePublished = jsonData.datePublished ? new Date(jsonData.datePublished) : new Date();
      
      // Use image URL hash as post ID
      const postId = imageUrl.split('/').filter(Boolean).pop().split('?')[0];
      
      if (!postId) {
        console.log(`⚠️ Could not extract post ID\n`);
        return;
      }

      const isFirstRun = !lastPosts[username];
      const lastPostId = lastPosts[username];

      if (isFirstRun || lastPostId !== postId) {
        if (isFirstRun) {
          console.log(`🆕 FIRST RUN - Sending latest post!`);
        } else {
          console.log(`🆕 NEW POST FOUND!`);
        }

        const postUrl = `https://www.instagram.com/${username}/`;
        console.log(`   URL: ${postUrl}\n`);

        await axios.post(webhookUrl, {
          username: 'Instagram Notifier',
          avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/240px-Instagram_icon.png',
          embeds: [{
            title: `🆕 New Post from @${username}`,
            description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
            url: postUrl,
            image: { url: imageUrl },
            color: 0xE4405F,
            timestamp: datePublished.toISOString(),
            footer: { text: 'Instagram Auto-Checker • Every 4 hours' }
          }]
        });

        console.log(`✓ Notified Discord!\n`);
        lastPosts[username] = postId;
      } else {
        console.log(`✓ No new posts\n`);
      }
    } catch (parseError) {
      console.log(`⚠️ Could not parse post data\n`);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

(async () => {
  for (const { username, webhook } of config) {
    await checkInstagram(username, webhook);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(lastPosts, null, 2));
  console.log('✅ Done!');
})();
