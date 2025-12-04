const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const INSTAGRAM_USERNAME = process.env.INSTAGRAM_USERNAME || 'uajm_esports';
const DATA_FILE = path.join(__dirname, '../../data/last-post.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function getInstagramPosts(username) {
  try {
    console.log(`Fetching Instagram posts for @${username}...`);
    
    // Using Instagram's public JSON endpoint (no auth required, but rate-limited)
    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000
    });

    // Parse HTML if JSON endpoint doesn't work
    const $ = cheerio.load(response.data);
    const scriptTags = $('script[type="application/ld+json"]');
    
    let posts = [];
    scriptTags.each((i, elem) => {
      try {
        const json = JSON.parse($(elem).html());
        if (json['@type'] === 'ProfilePage' && json.mainEntity) {
          // Extract posts from structured data
          posts = json.mainEntity.interactionStatistic || [];
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Fallback: scrape from page
    if (posts.length === 0) {
      console.log('Using fallback scraping method...');
      const metaTags = $('meta[property="og:description"]');
      const description = metaTags.attr('content') || '';
      
      // Extract post count from description (e.g., "123 Posts, 456 Followers")
      const match = description.match(/(\d+)\s+Posts/i);
      if (match) {
        return { postCount: parseInt(match[1], 10) };
      }
    }

    return { postCount: posts.length };
  } catch (error) {
    console.error('Error fetching Instagram data:', error.message);
    throw error;
  }
}

async function sendDiscordNotification(message, embed = null) {
  if (!DISCORD_WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK_URL not set!');
    return;
  }

  const payload = {
    content: message,
    embeds: embed ? [embed] : []
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log('Discord notification sent successfully!');
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
  }
}

async function main() {
  console.log('Starting Instagram content watcher...');
  console.log(`Target account: @${INSTAGRAM_USERNAME}`);

  try {
    // Get current Instagram data
    const currentData = await getInstagramPosts(INSTAGRAM_USERNAME);
    console.log(`Current post count: ${currentData.postCount}`);

    // Read last known data
    let lastData = { postCount: 0 };
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
      lastData = JSON.parse(fileContent);
      console.log(`Last known post count: ${lastData.postCount}`);
    } else {
      console.log('No previous data found. Initializing...');
    }

    // Check for new posts
    if (currentData.postCount > lastData.postCount) {
      const newPostsCount = currentData.postCount - lastData.postCount;
      console.log(`🎉 ${newPostsCount} new post(s) detected!`);

      // Send Discord notification
      const embed = {
        title: '📸 New Instagram Post!',
        description: `**@${INSTAGRAM_USERNAME}** just posted ${newPostsCount} new content!`,
        color: 0xE1306C, // Instagram pink
        url: `https://www.instagram.com/${INSTAGRAM_USERNAME}/`,
        thumbnail: {
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/2048px-Instagram_icon.png'
        },
        fields: [
          {
            name: 'Total Posts',
            value: `${currentData.postCount}`,
            inline: true
          },
          {
            name: 'New Posts',
            value: `${newPostsCount}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Instagram Watcher via GitHub Actions'
        }
      };

      await sendDiscordNotification(
        `🔔 **New content from @${INSTAGRAM_USERNAME}!**\n${newPostsCount} new post(s) detected. Check it out!`,
        embed
      );
    } else {
      console.log('No new posts detected.');
    }

    // Save current data
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
    console.log('Data saved successfully!');

  } catch (error) {
    console.error('Error in main execution:', error);
    
    // Send error notification to Discord
    await sendDiscordNotification(
      `⚠️ **Instagram Watcher Error**\nFailed to check @${INSTAGRAM_USERNAME}. Error: ${error.message}`
    );
    
    process.exit(1);
  }
}

main();
