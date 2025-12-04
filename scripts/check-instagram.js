const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Config dari GitHub Secrets (format JSON)
const WEBHOOK_CONFIG = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

// File untuk menyimpan post terakhir
const DATA_FILE = path.join(__dirname, '../data/last-posts.json');

// Load data post terakhir
function loadLastPosts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading last posts:', err);
  }
  return {};
}

// Save data post terakhir
function saveLastPosts(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving last posts:', err);
  }
}

// Fetch Instagram posts (scraping sederhana)
async function fetchInstagramPosts(username) {
  try {
    // Method 1: Coba ambil dari public profile (tanpa login)
    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      timeout: 10000
    });

    // Parse response (Instagram API format bisa berubah)
    if (response.data && response.data.graphql) {
      const user = response.data.graphql.user;
      const posts = user.edge_owner_to_timeline_media.edges;
      
      return posts.slice(0, 3).map(edge => ({
        id: edge.node.id,
        shortcode: edge.node.shortcode,
        caption: edge.node.edge_media_to_caption.edges[0]?.node.text || '',
        timestamp: edge.node.taken_at_timestamp,
        url: `https://www.instagram.com/p/${edge.node.shortcode}/`,
        thumbnail: edge.node.thumbnail_src || edge.node.display_url
      }));
    }
    
    return [];
  } catch (err) {
    console.error(`Error fetching Instagram for ${username}:`, err.message);
    
    // Fallback: Return dummy data untuk testing
    console.log('Using fallback method...');
    return [{
      id: Date.now().toString(),
      shortcode: 'test123',
      caption: `Latest post from @${username} (fallback mode)`,
      timestamp: Math.floor(Date.now() / 1000),
      url: `https://www.instagram.com/${username}/`,
      thumbnail: 'https://via.placeholder.com/150'
    }];
  }
}

// Send notification ke Discord
async function sendDiscordNotification(webhookUrl, username, post, isFirstRun) {
  try {
    const embed = {
      title: isFirstRun ? `🔔 Now tracking @${username}` : `📸 New post from @${username}`,
      description: post.caption.substring(0, 200) + (post.caption.length > 200 ? '...' : ''),
      url: post.url,
      color: isFirstRun ? 0x00FF00 : 0xE1306C, // Green for first run, Instagram pink for new posts
      thumbnail: {
        url: post.thumbnail
      },
      fields: [
        {
          name: 'Posted',
          value: `<t:${post.timestamp}:R>`,
          inline: true
        },
        {
          name: 'Link',
          value: `[View on Instagram](${post.url})`,
          inline: true
        }
      ],
      footer: {
        text: isFirstRun ? 'Auto-checker started!' : 'Instagram Auto Checker',
        icon_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png'
      },
      timestamp: new Date().toISOString()
    };

    await axios.post(webhookUrl, {
      embeds: [embed],
      username: 'Instagram Checker',
      avatar_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png'
    });

    console.log(`✅ Sent notification for @${username} to Discord`);
  } catch (err) {
    console.error(`Error sending Discord notification:`, err.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Instagram checker...');
  console.log(`⏰ Check time: ${new Date().toISOString()}`);

  if (!WEBHOOK_CONFIG || WEBHOOK_CONFIG.length === 0) {
    console.error('❌ No webhook config found. Please set WEBHOOK_CONFIG secret in GitHub.');
    process.exit(1);
  }

  const lastPosts = loadLastPosts();
  let hasNewPosts = false;

  for (const config of WEBHOOK_CONFIG) {
    const { username, webhook } = config;
    
    console.log(`\n📱 Checking @${username}...`);
    
    const posts = await fetchInstagramPosts(username);
    
    if (posts.length === 0) {
      console.log(`⚠️ No posts found for @${username}`);
      continue;
    }

    const latestPost = posts[0];
    const lastPostId = lastPosts[username];
    
    // First run: just save and notify
    if (!lastPostId) {
      console.log(`🎯 First run for @${username}, saving latest post`);
      await sendDiscordNotification(webhook, username, latestPost, true);
      lastPosts[username] = latestPost.id;
      hasNewPosts = true;
      continue;
    }

    // Check for new posts
    if (latestPost.id !== lastPostId) {
      console.log(`🆕 New post detected for @${username}!`);
      await sendDiscordNotification(webhook, username, latestPost, false);
      lastPosts[username] = latestPost.id;
      hasNewPosts = true;
    } else {
      console.log(`✓ No new posts for @${username}`);
    }

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save updated data
  if (hasNewPosts) {
    saveLastPosts(lastPosts);
    console.log('\n💾 Saved last posts data');
  }

  console.log('\n✅ Check completed!');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
