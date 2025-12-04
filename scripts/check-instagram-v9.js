const axios = require('axios');
const fs = require('fs');
const path = require('path');

const WEBHOOK_CONFIG = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');
const DATA_FILE = path.join(__dirname, '../data/last-posts.json');

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

async function fetchInstagramPosts(username) {
  try {
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

    if (response.data && response.data.graphql) {
      const user = response.data.graphql.user;
      const posts = user.edge_owner_to_timeline_media.edges;
      
      return posts.slice(0, 1).map(edge => ({
        id: edge.node.id,
        shortcode: edge.node.shortcode,
        caption: edge.node.edge_media_to_caption.edges[0]?.node.text || '',
        timestamp: edge.node.taken_at_timestamp,
        url: `https://www.instagram.com/p/${edge.node.shortcode}/`,
        thumbnail: edge.node.display_url
      }));
    }
    
    return [];
  } catch (err) {
    console.error(`Error fetching Instagram for ${username}:`, err.message);
    return [];
  }
}

async function sendDiscordNotification(webhookUrl, username, post, isFirstRun) {
  try {
    const embed = {
      title: isFirstRun ? `✅ Now monitoring @${username}` : `📸 New post from @${username}`,
      description: post.caption.substring(0, 200) + (post.caption.length > 200 ? '...' : ''),
      url: post.url,
      color: isFirstRun ? 0x00FF00 : 0xE1306C,
      image: { url: post.thumbnail },
      footer: { text: `Posted at ${new Date(post.timestamp * 1000).toLocaleString()}` }
    };

    await axios.post(webhookUrl, { embeds: [embed] });
    console.log(`   ✅ Sent to Discord`);
  } catch (err) {
    console.error(`Error sending Discord notification:`, err.message);
  }
}

async function main() {
  console.log('🚀 Instagram Checker v9');
  console.log(`⏰ ${new Date().toISOString()}\n`);

  const lastPosts = loadLastPosts();

  for (const config of WEBHOOK_CONFIG) {
    const { username, webhook } = config;
    console.log(`📱 Checking @${username}...`);

    try {
      const posts = await fetchInstagramPosts(username);
      if (!posts.length) {
        console.log(`   ⚠️ No posts found\n`);
        continue;
      }

      const latestPost = posts[0];
      const lastPostId = lastPosts[username];

      if (!lastPostId) {
        // First run - send notification
        console.log(`   🆕 First run - sending latest post`);
        await sendDiscordNotification(webhook, username, latestPost, true);
        lastPosts[username] = latestPost.id;
        saveLastPosts(lastPosts);
      } else if (lastPostId !== latestPost.id) {
        // New post detected
        console.log(`   🆕 NEW POST DETECTED!`);
        await sendDiscordNotification(webhook, username, latestPost, false);
        lastPosts[username] = latestPost.id;
        saveLastPosts(lastPosts);
      } else {
        // No new posts
        console.log(`   ℹ️ No new posts`);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    console.log();
  }

  console.log('✅ Done!');
}

main().catch(console.error);
