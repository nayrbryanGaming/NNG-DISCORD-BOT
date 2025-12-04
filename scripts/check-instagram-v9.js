#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/last-posts.json');
const CONFIG = JSON.parse(process.env.WEBHOOK_CONFIG || '[]');

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function postToDiscord(webhook, embed) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ embeds: [embed] });
    const url = new URL(webhook);
    
    https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    }).on('error', resolve).end(payload);
  });
}

async function checkInstagram() {
  console.log('🚀 Instagram Checker v9 (SIMPLE)');
  console.log(`⏰ ${new Date().toISOString()}\n`);

  let state = {};
  if (fs.existsSync(STATE_FILE)) {
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  }

  for (const { username, webhook } of CONFIG) {
    console.log(`📱 @${username}...`);
    
    try {
      const html = await fetchURL(`https://www.instagram.com/${username}/`);
      const match = html.match(/{"id":"(\d+)","taken_at":\d+,"device_timestamp":"[^"]+","media_type":\d+/);
      
      if (!match) {
        console.log(`   ⚠️ Could not parse\n`);
        continue;
      }

      const postId = match[1];
      const lastId = state[username];

      if (!lastId) {
        console.log(`   ✅ First run - saved\n`);
        state[username] = postId;
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        continue;
      }

      if (postId !== lastId) {
        console.log(`   🆕 NEW POST!\n`);
        await postToDiscord(webhook, {
          title: `📸 New from @${username}`,
          url: `https://www.instagram.com/${username}/`,
          color: 0xE1306C
        });
        state[username] = postId;
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      } else {
        console.log(`   ℹ️ No new posts\n`);
      }
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}\n`);
    }
  }

  console.log('✅ Done!');
}

checkInstagram().catch(console.error);
