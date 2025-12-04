const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/last-posts.json');
const config = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

let lastPosts = {};
try {
  if (fs.existsSync(DATA_FILE)) lastPosts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {}

console.log('🚀 Instagram Checker v4 (First Run Auto-Send)');
console.log('⏰', new Date().toISOString(), '\n');

async function checkInstagram(username, webhookUrl) {
  console.log(`📱 Checking @${username}...`);
  
  try {
    // Use RSS Bridge to get Instagram feed
    const rssUrl = `https://rss.app/feeds/${username}.xml`;
    
    const response = await axios.get(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });

    const xml = response.data;
    const linkMatch = xml.match(/<link>([^<]+)<\/link>/g);
    const titleMatch = xml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
    const pubDateMatch = xml.match(/<pubDate>([^<]+)<\/pubDate>/);
    
    if (!linkMatch || linkMatch.length < 2) {
      console.log(`⚠️ No posts found\n`);
      return;
    }

    const postUrl = linkMatch[1].replace(/<\/?link>/g, '');
    const postId = postUrl.split('/').filter(Boolean).pop();
    const title = titleMatch ? titleMatch[1] : `New post from @${username}`;
    const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

    const isFirstRun = !lastPosts[username];
    const lastPostId = lastPosts[username];

    // First run: send post terakhir apapun
    // Subsequent runs: hanya send kalau ada post baru
    if (isFirstRun || lastPostId !== postId) {
      if (isFirstRun) {
        console.log(`🆕 FIRST RUN - Sending latest post!`);
      } else {
        console.log(`🆕 NEW POST FOUND!`);
      }
      console.log(`   URL: ${postUrl}\n`);

      await axios.post(webhookUrl, {
        username: 'Instagram Notifier',
        avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/240px-Instagram_icon.png',
        embeds: [{
          title: `🆕 New Post from @${username}`,
          description: title.substring(0, 300) + (title.length > 300 ? '...' : ''),
          url: postUrl,
          color: 0xE4405F,
          timestamp: pubDate.toISOString(),
          footer: { text: 'Instagram Auto-Checker • Every 4 hours' }
        }]
      });

      console.log(`✓ Notified Discord!\n`);
      lastPosts[username] = postId;
    } else {
      console.log(`✓ No new posts\n`);
    }
    
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
