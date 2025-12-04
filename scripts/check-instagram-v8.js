#!/usr/bin/env node
/**
 * Instagram Checker v8 - Simple HTML Scraper
 * Fetch latest posts and send to Discord via webhook
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/last-posts.json');
const CONFIG = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

// Fetch HTML page
async function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.instagram.com/',
    };

    https.get(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse Instagram profile JSON from HTML
async function getInstagramProfile(username) {
  try {
    const html = await fetchHTML(`https://www.instagram.com/${username}/`);
    
    // Find JSON data in window.__data
    const match = html.match(/<script type="application\/ld\+json">({.*?"@context":"https:\/\/schema\.org".*?})<\/script>/);
    if (match) {
      const jsonData = JSON.parse(match[1]);
      if (jsonData.mainEntity) {
        return {
          username: username,
          posts: jsonData.mainEntity.post || [],
          bio: jsonData.description || '',
          followers: jsonData.interactionStatistic?.[0]?.userInteractionCount || 0
        };
      }
    }

    // Fallback: extract from shared data
    const sharedMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
    if (sharedMatch) {
      const data = JSON.parse(sharedMatch[1]);
      const user = data.entry_data?.ProfilePage?.[0]?.graphql?.user;
      if (user && user.edge_owner_to_timeline_v2?.edges?.length > 0) {
        const latestPost = user.edge_owner_to_timeline_v2.edges[0].node;
        return {
          username: username,
          postId: latestPost.id,
          caption: latestPost.edge_media_to_caption?.edges?.[0]?.node?.text || 'No caption',
          imageUrl: latestPost.display_url,
          postUrl: `https://www.instagram.com/p/${latestPost.shortcode}/`,
          likes: latestPost.edge_liked_by?.count || 0,
          comments: latestPost.edge_media_to_comment?.count || 0,
          timestamp: latestPost.taken_at_timestamp
        };
      }
    }

    return null;
  } catch (err) {
    console.log(`❌ Error fetching ${username}:`, err.message);
    return null;
  }
}

// Send to Discord webhook
async function sendToDiscord(webhook, username, post) {
  try {
    const embed = {
      title: `📸 New post from @${username}`,
      description: post.caption?.substring(0, 250) || 'No caption',
      image: { url: post.imageUrl },
      url: post.postUrl,
      color: 0xE1306C,
      footer: { text: `@${username}` }
    };

    if (post.likes !== undefined) {
      embed.fields = [
        { name: '❤️ Likes', value: `${post.likes}`, inline: true },
        { name: '💬 Comments', value: `${post.comments || 0}`, inline: true }
      ];
    }

    const payload = JSON.stringify({ embeds: [embed] });
    const opts = new URL(webhook);
    opts.method = 'POST';
    opts.headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };

    return new Promise((resolve) => {
      https.request(opts, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          console.log(`   ✅ Sent to Discord`);
          resolve();
        });
      }).on('error', (err) => {
        console.log(`   ⚠️ Webhook error: ${err.message}`);
        resolve();
      }).end(payload);
    });
  } catch (err) {
    console.log(`   ⚠️ Error: ${err.message}`);
  }
}

// Load/Save state
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Main
(async () => {
  console.log('🚀 Instagram Checker v8 (HTML Scraper)');
  console.log(`⏰ ${new Date().toISOString()}\n`);

  const state = loadState();

  for (const config of CONFIG) {
    const { username, webhook } = config;
    console.log(`📱 Checking @${username}...`);

    const profile = await getInstagramProfile(username);
    if (!profile || !profile.postId) {
      console.log(`   ⚠️ Could not fetch post\n`);
      continue;
    }

    const lastPostId = state[username];

    // First run
    if (!lastPostId) {
      console.log(`   🆕 First run - post ID saved`);
      await sendToDiscord(webhook, username, profile);
      state[username] = profile.postId;
      saveState(state);
    } 
    // New post
    else if (lastPostId !== profile.postId) {
      console.log(`   🆕 New post detected!`);
      await sendToDiscord(webhook, username, profile);
      state[username] = profile.postId;
      saveState(state);
    } 
    // Same post
    else {
      console.log(`   ℹ️ No new posts`);
    }
    console.log();
  }

  console.log('✅ Done!');
})();

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
