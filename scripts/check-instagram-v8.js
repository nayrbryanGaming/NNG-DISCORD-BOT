#!/usr/bin/env node
/**
 * Instagram Checker v8 - Simple & Clean
 * Fetch latest posts and send to Discord
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/last-posts.json');
const CONFIG = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

// Simple HTTPS GET
async function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...headers,
    };

    https.get(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ error: res.statusCode });
        }
      });
    }).on('error', reject);
  });
}

// Get Instagram user ID
async function getUserId(username) {
  try {
    const data = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`);
    return data?.data?.user?.id;
  } catch (err) {
    console.log(`❌ Error fetching user ${username}:`, err.message);
    return null;
  }
}

// Get latest posts from Instagram
async function getLatestPosts(username, userId, limit = 3) {
  try {
    const data = await fetch(
      `https://www.instagram.com/api/v1/feed/user/${userId}/username_feed/?count=${limit}`
    );
    
    if (!data?.items) return [];
    
    return data.items.map((post) => ({
      id: post.id,
      caption: post.caption?.text || 'No caption',
      image: post.carousel_media ? post.carousel_media[0].image_versions2.candidates[0].url : 
             post.image_versions2?.candidates[0]?.url || null,
      link: `https://www.instagram.com/p/${post.code}/`,
      timestamp: post.taken_at,
    }));
  } catch (err) {
    console.log(`❌ Error fetching posts for ${username}:`, err.message);
    return [];
  }
}

// Load previous state
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

// Save state
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Send to Discord
async function sendToDiscord(webhook, embed) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ embeds: [embed] });
    const opts = new URL(webhook);
    opts.method = 'POST';
    opts.headers = {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
    };

    https.request(opts, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve());
    }).on('error', (err) => {
      console.log(`⚠️ Webhook error: ${err.message}`);
      resolve();
    }).end(payload);
  });
}

// Main
(async () => {
  console.log('🚀 Instagram Checker v8');
  console.log(`⏰ ${new Date().toISOString()}\n`);

  const state = loadState();

  for (const config of CONFIG) {
    const { username, webhook } = config;
    console.log(`📱 Checking @${username}...`);

    const userId = await getUserId(username);
    if (!userId) {
      console.log(`   ⚠️ User not found\n`);
      continue;
    }

    const posts = await getLatestPosts(username, userId, 1);
    if (!posts.length) {
      console.log(`   ⚠️ No posts found\n`);
      continue;
    }

    const post = posts[0];
    const lastId = state[username];

    // First run - just save state
    if (!lastId) {
      console.log(`   ✅ First run - saved post ID: ${post.id}`);
      state[username] = post.id;
      saveState(state);
      console.log();
      continue;
    }

    // New post detected
    if (post.id !== lastId) {
      console.log(`   🆕 New post detected!`);
      
      const embed = {
        title: `New post from @${username}`,
        description: post.caption.substring(0, 200) + (post.caption.length > 200 ? '...' : ''),
        image: post.image ? { url: post.image } : undefined,
        url: post.link,
        color: 14398509, // Instagram pink
        timestamp: new Date(post.timestamp * 1000).toISOString(),
      };

      await sendToDiscord(webhook, embed);
      console.log(`   ✅ Sent to Discord`);
      state[username] = post.id;
      saveState(state);
    } else {
      console.log(`   ✅ No new posts`);
    }
    console.log();
  }

  console.log('✅ Done!');
})().catch(console.error);
