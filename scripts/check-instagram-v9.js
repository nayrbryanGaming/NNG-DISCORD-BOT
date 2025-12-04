const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/last-posts.json');
const config = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

let lastPosts = {};
try {
  if (fs.existsSync(DATA_FILE)) lastPosts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (err) {}

console.log('🚀 Instagram Checker v9 (RESTORED)');
console.log('⏰', new Date().toISOString(), '\n');

async function checkInstagram(username, webhookUrl) {
  console.log(`📱 Checking @${username}...`);

  try {
    let postUrl, postId, title, pubDate;

    // METHOD 1: Try RSS Bridge
    try {
      const rssUrl = `https://rss.app/feeds/${username}.xml`;
      const response = await axios.get(rssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });

      const xml = response.data;
      const linkMatch = xml.match(/<link>([^<]+)<\/link>/g);
      const titleMatch = xml.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
      const pubDateMatch = xml.match(/<pubDate>([^<]+)<\/pubDate>/);

      if (linkMatch && linkMatch.length >= 2) {
        postUrl = linkMatch[1].replace(/<\/?link>/g, '');
        postId = postUrl.split('/').filter(Boolean).pop();
        title = titleMatch ? titleMatch[1] : `New post from @${username}`;
        pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();
        console.log(`   ✓ Method 1 (RSS) success`);
      }
    } catch (err) {
      console.log(`   ⚠️ Method 1 (RSS) failed: ${err.message}`);
    }

    // METHOD 2: Try HTML scraping if RSS failed
    if (!postUrl) {
      try {
        const html = await axios.get(`https://www.instagram.com/${username}/`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          },
          timeout: 15000,
          maxRedirects: 5
        });

        // Try multiple regex patterns
        let shortcode = null;
        
        // Pattern 1: Standard shortcode in JSON
        let match = html.data.match(/"shortcode":"([A-Za-z0-9_-]+)"/);
        if (match) shortcode = match[1];
        
        // Pattern 2: From edge_owner_to_timeline_media
        if (!shortcode) {
          match = html.data.match(/edge_owner_to_timeline_media.*?"shortcode":"([A-Za-z0-9_-]+)"/);
          if (match) shortcode = match[1];
        }
        
        // Pattern 3: From URL pattern
        if (!shortcode) {
          match = html.data.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)\//);
          if (match) shortcode = match[1];
        }

        if (shortcode) {
          postId = shortcode;
          postUrl = `https://www.instagram.com/p/${shortcode}/`;
          title = `New post from @${username}`;
          pubDate = new Date();
          console.log(`   ✓ Method 2 (HTML scraping) success`);
        } else {
          console.log(`   ⚠️ Method 2 (HTML) failed: No shortcode found in HTML`);
        }
      } catch (err) {
        console.log(`   ⚠️ Method 2 (HTML) failed: ${err.message}`);
      }
    }

    // METHOD 3: Try alternative RSS (Bibliogram)
    if (!postUrl) {
      try {
        const altRssUrl = `https://bibliogram.art/u/${username}/rss.xml`;
        const response = await axios.get(altRssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 10000
        });

        const xml = response.data;
        const linkMatch = xml.match(/<link>([^<]+)<\/link>/g);
        if (linkMatch && linkMatch.length >= 2) {
          postUrl = linkMatch[1].replace(/<\/?link>/g, '');
          postId = postUrl.split('/').filter(Boolean).pop();
          title = `New post from @${username}`;
          pubDate = new Date();
          console.log(`   ✓ Method 3 (Alt RSS) success`);
        }
      } catch (err) {
        console.log(`   ⚠️ Method 3 (Alt RSS) failed: ${err.message}`);
      }
    }

    // If all methods failed
    if (!postUrl) {
      throw new Error('All methods failed to fetch Instagram data');
    }

    // Check if post is new
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
        title: `📸 New Post from @${username}`,
        description: title,
        url: postUrl,
        color: 0xE4405F,
        timestamp: pubDate.toISOString(),
        footer: { text: 'Instagram Auto-Checker • Every 4 hours' }
      }]
    });

    console.log(`✓ Notified Discord!\n`);
    lastPosts[username] = postId;

  } catch (error) {
    console.error(`❌ All methods failed: ${error.message}`);

    // FIRST RUN: Send test notification
    if (!lastPosts[username]) {
      console.log(`   📢 First run - sending setup confirmation...\n`);
      try {
        await axios.post(webhookUrl, {
          username: 'Instagram Notifier',
          avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/240px-Instagram_icon.png',
          embeds: [{
            title: `✅ Instagram Checker Started for @${username}`,
            description: `Monitoring Instagram account **@${username}**\n\n🕐 Check frequency: Every 4 hours\n🔔 You'll be notified here when new posts are detected!\n\n[View Profile](https://www.instagram.com/${username}/)`,
            color: 0x00FF00,
            timestamp: new Date().toISOString(),
            footer: { text: 'Initial Setup Confirmation | Today at ' + new Date().toLocaleTimeString() }
          }]
        });
        console.log(`✓ Setup notification sent!\n`);
        lastPosts[username] = 'init';
      } catch (webhookError) {
        console.error(`❌ Webhook error: ${webhookError.message}\n`);
      }
    } else {
      console.log();
    }
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
