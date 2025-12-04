const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/last-posts.json');
const config = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

let lastPosts = {};
try {
  if (fs.existsSync(DATA_FILE)) lastPosts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {}

console.log('🚀 Instagram Checker v2');
console.log('⏰', new Date().toISOString(), '\n');

async function checkInstagram(username, webhookUrl) {
  console.log(`📱 Checking @${username}...`);
  
  try {
    // Use InstaNavigation API (free, no auth needed)
    const apiUrl = `https://www.instanavigation.com/api/profile/${username}`;
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const data = response.data;
    if (!data || !data.edge_owner_to_timeline_media || data.edge_owner_to_timeline_media.edges.length === 0) {
      console.log(`⚠️ No posts found\n`);
      return;
    }

    const latestPost = data.edge_owner_to_timeline_media.edges[0].node;
    const postId = latestPost.id;
    const shortcode = latestPost.shortcode;
    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    const caption = latestPost.edge_media_to_caption?.edges[0]?.node?.text || `New post from @${username}`;
    const timestamp = latestPost.taken_at_timestamp * 1000;

    if (lastPosts[username] === postId) {
      console.log(`✓ No new posts\n`);
      return;
    }

    console.log(`🆕 NEW POST FOUND!`);
    console.log(`   URL: ${postUrl}\n`);

    await axios.post(webhookUrl, {
      username: 'Instagram Notifier',
      avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/240px-Instagram_icon.png',
      embeds: [{
        title: `🆕 New Post from @${username}`,
        description: caption.substring(0, 300) + (caption.length > 300 ? '...' : ''),
        url: postUrl,
        color: 0xE4405F,
        timestamp: new Date(timestamp).toISOString(),
        footer: { text: 'Instagram Auto-Checker • Every 4 hours' }
      }]
    });

    console.log(`✓ Notified Discord!\n`);
    lastPosts[username] = postId;
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }
}

(async () => {
  for (const { username, webhook } of config) {
    await checkInstagram(username, webhook);
    await new Promise(r => setTimeout(r, 2000));
  }
  
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(lastPosts, null, 2));
  console.log('✅ Done!');
})();
