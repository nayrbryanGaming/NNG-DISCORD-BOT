# SETUP_GUIDE.md - Detailed Setup Instructions

## 📚 Related Guides

- **[Multi-Server Configuration](./MULTI_SERVER_GUIDE.md)** - Setup bot di multiple servers dengan setting berbeda-beda
- **[Quick Reference](./QUICK_REFERENCE.md)** - Cheat sheet untuk commands

## 📋 Prerequisites

Before you begin, ensure you have:
- [Node.js](https://nodejs.org/) version 18 or higher installed
- A Discord account
- A text editor (VS Code recommended)
- Basic command line knowledge

## 🎯 Step-by-Step Setup

### Step 1: Create Discord Bot

1. **Go to Discord Developer Portal**
   - Visit: https://discord.com/developers/applications
   - Log in with your Discord account

2. **Create New Application**
   - Click the "New Application" button (top right)
   - Enter a name: "Social Media Watcher"
   - Click "Create"

3. **Create Bot User**
   - In the left sidebar, click "Bot"
   - Click "Add Bot" button
   - Click "Yes, do it!"
   - Under the bot's username, click "Reset Token"
   - Click "Copy" to copy your bot token
   - **⚠️ IMPORTANT:** Save this token securely! You'll need it later.

4. **Configure Bot Settings**
   - Scroll down to "Privileged Gateway Intents"
   - Enable "MESSAGE CONTENT INTENT" (optional, for future features)
   - Click "Save Changes"

5. **Get Your Client ID**
   - Click "OAuth2" in the left sidebar
   - Under "Client ID", click "Copy"
   - Save this for inviting the bot

### Step 2: Install the Bot

1. **Download/Clone the Project**
   ```powershell
   # If you have the code
   cd path\to\social-media-watcher-bot
   
   # Or clone from git
   git clone <repository-url>
   cd social-media-watcher-bot
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```
   
   This will install all required packages:
   - discord.js (Discord API)
   - @prisma/client (Database)
   - dotenv (Environment variables)
   - axios (HTTP requests)
   - winston (Logging)
   - node-cron (Scheduler)

3. **Create Data Directory**
   ```powershell
   mkdir data
   ```

### Step 3: Configure Environment

1. **Create Environment File**
   ```powershell
   # Copy the example file
   cp .env.example .env
   ```

2. **Edit .env File**
   
   Open `.env` in a text editor and fill in:

   ```env
   # Required: Your Discord bot token from Step 1
   DISCORD_TOKEN=paste_your_bot_token_here
   
   # Required: Database location
   DATABASE_URL="file:./data/bot.db"
   
   # Optional: Environment
   NODE_ENV=development
   
   # Optional: YouTube API Key (highly recommended)
   # Get free key from: https://console.cloud.google.com/
   YOUTUBE_API_KEY=your_youtube_api_key_here
   
   # Optional: Logging level
   LOG_LEVEL=info
   ```

### Step 4: Get YouTube API Key (Optional but Recommended)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create New Project**
   - Click project dropdown (top left)
   - Click "New Project"
   - Name it "Social Watcher Bot"
   - Click "Create"

3. **Enable YouTube Data API v3**
   - In the search bar, type "YouTube Data API v3"
   - Click on it
   - Click "Enable"

4. **Create API Key**
   - Click "Credentials" in left sidebar
   - Click "Create Credentials" → "API Key"
   - Copy the API key
   - Paste it into `.env` as `YOUTUBE_API_KEY`

5. **Set Quota (Optional)**
   - Free tier gives you 10,000 requests/day
   - This is plenty for moderate usage
   - Each YouTube channel check costs ~1-100 units

### Step 4b: Setup Crypto Payments (Premium Tier - Optional)

**This enables USDC/USDT payments on Polygon for premium features.**

1. **Generate Polygon Wallet**
   
   Choose one method:
   
   **Option A: MetaMask (Recommended)**
   - Install MetaMask extension: https://metamask.io/
   - Create a new wallet
   - Add Polygon network (chainid 137)
   - Copy your public address (starts with 0x...)
   
   **Option B: MyEtherWallet**
   - Visit: https://www.myetherwallet.com/
   - Click "Create New Wallet"
   - Generate wallet and save keys securely
   - Copy public address

2. **Add to Environment**
   ```env
   ENABLE_CRYPTO_PAYMENTS=true
   POLYGON_RPC_URL=https://polygon-rpc.com
   PAYMENT_WALLET_ADDRESS=0xYourWalletAddressHere
   ```

3. **Share with Users**
   - Users will run `/premium subscribe`
   - Bot displays your wallet address and required amount
   - They send USDC or USDT on Polygon network
   - Payment is automatically detected within 2-10 minutes

**⚠️ SECURITY WARNING:**
- Never share your private key
- Keep wallet address in `.env` only
- Consider using separate wallet for bot payments
- Test with small amount first

### Step 4c: Setup Telegram Support (Optional)

To monitor Telegram channels:

1. **Create Telegram Bot**
   - Talk to @BotFather on Telegram
   - Type `/newbot`
   - Follow the steps, you'll get a token

2. **Add to .env**
   ```env
   TELEGRAM_BOT_TOKEN=your_token_here
   ```

3. **Add Bot to Your Channel**
   - Add the bot as admin to your channel
   - It will now be able to read messages



## 🌍 Supported Platforms

The bot supports monitoring:

| Platform | Free | Premium | Method |
|----------|------|---------|--------|
| **YouTube** | ✅ | ✅ | RSS Feed + API |
| **Twitter/X** | ✅ | ✅ | Nitter (Public) |
| **Instagram** | ⚠️ | ⚠️ | Web Scraping (Limited) |
| **TikTok** | ⚠️ | ⚠️ | Web Scraping (Limited) |
| **Reddit** | ✅ | ✅ | Public JSON API |
| **Telegram** | ✅ | ✅ | Bot API / Web |

**Legend:**
- ✅ = Reliable, full support
- ⚠️ = Best effort (may be fragile if platform changes)

### Adding Links

```
/link add platform:YouTube url:https://www.youtube.com/@channelname

/link add platform:Twitter url:https://x.com/username

/link add platform:Reddit url:https://reddit.com/r/subreddit

/link add platform:Telegram url:https://t.me/channelname

/link add platform:Instagram url:https://instagram.com/username

/link add platform:TikTok url:https://tiktok.com/@username
```



1. **Generate Prisma Client**
   ```powershell
   npm run prisma:generate
   ```

2. **Create Database**
   ```powershell
   npm run prisma:push
   ```
   
   This creates `data/bot.db` SQLite database with all tables.

3. **Verify Database (Optional)**
   ```powershell
   npm run prisma:studio
   ```
   
   Opens a web interface at http://localhost:5555 to view your database.

### Step 6: Invite Bot to Your Server

1. **Create Invite URL**
   
   Replace `YOUR_CLIENT_ID` with the Client ID from Step 1:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024704&scope=bot%20applications.commands
   ```

2. **Open URL in Browser**
   - Paste the URL in your browser
   - Select a server where you have "Manage Server" permission
   - Click "Authorize"
   - Complete the captcha

3. **Verify Bot Joined**
   - Check your Discord server
   - You should see the bot appear in the member list (offline for now)

### Step 7: Run the Bot

1. **Start in Development Mode**
   ```powershell
   npm run dev
   ```

2. **Check for Successful Startup**
   
   You should see:
   ```
   ✅ Database connected
   ✅ Bot logged in as Social Media Watcher#1234
   ✅ Registered 5 slash commands
   [Watcher] Initialized - running every minute
   ```

3. **Test in Discord**
   - Go to your Discord server
   - Type `/start` - the bot should respond with a welcome message
   - Type `/link add` - you should see the command options

### Step 8: Add Your First Link

1. **Set Announcement Channel**
   ```
   /settings channel #announcements
   ```

2. **Add a YouTube Channel**
   ```
   /link add platform:YouTube url:https://youtube.com/@MrBeast
   ```

3. **Verify Link Was Added**
   ```
   /link list
   ```

4. **Wait for Content**
   - The bot checks every 10 minutes (free tier)
   - When the channel posts a new video, you'll get an announcement!

## 🔧 Advanced Configuration

### Using PostgreSQL Instead of SQLite

1. **Install PostgreSQL**
   - Download from: https://www.postgresql.org/download/

2. **Create Database**
   ```sql
   CREATE DATABASE socialwatcher;
   ```

3. **Update .env**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/socialwatcher"
   ```

4. **Update schema.prisma**
   ```prisma
   datasource db {
     provider = "postgresql"  // Changed from sqlite
     url      = env("DATABASE_URL")
   }
   ```

5. **Migrate**
   ```powershell
   npm run prisma:migrate dev --name init
   ```

### Running in Production

1. **Build the Project**
   ```powershell
   npm run build
   ```

2. **Install PM2** (Process Manager)
   ```powershell
   npm install -g pm2
   ```

3. **Start with PM2**
   ```powershell
   pm2 start dist/index.js --name social-watcher
   pm2 save
   pm2 startup
   ```

4. **Monitor**
   ```powershell
   pm2 status
   pm2 logs social-watcher
   pm2 restart social-watcher
   ```

### Deploying to Railway

1. **Install Railway CLI**
   ```powershell
   npm install -g @railway/cli
   ```

2. **Login**
   ```powershell
   railway login
   ```

3. **Initialize**
   ```powershell
   railway init
   ```

4. **Add PostgreSQL** (recommended for production)
   ```powershell
   railway add postgresql
   ```

5. **Set Environment Variables**
   ```powershell
   railway variables set DISCORD_TOKEN=your_token_here
   railway variables set PAYMENT_WALLET_ADDRESS=0xyouraddress
   railway variables set ENABLE_CRYPTO_PAYMENTS=true
   railway variables set POLYGON_RPC_URL=https://polygon-rpc.com
   ```

6. **Deploy**
   ```powershell
   railway up
   ```

### Deploying to Render

1. **Push Code to GitHub**
   ```powershell
   git remote add origin https://github.com/yourusername/repo.git
   git push -u origin main
   ```

2. **Create Service on Render**
   - Visit: https://dashboard.render.com/
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Select repo and branch
   - Build command: `npm run build`
   - Start command: `npm start`

3. **Add Environment Variables**
   - In Render dashboard, add all variables from `.env`
   - Click "Create Web Service"

### Deploying to Fly.io

1. **Install Fly CLI**
   ```powershell
   brew install flyctl  # macOS/Linux
   # Or download: https://fly.io/docs/getting-started/installing-flyctl/
   ```

2. **Login**
   ```powershell
   flyctl auth login
   ```

3. **Create App**
   ```powershell
   flyctl launch --no-deploy
   ```

4. **Add Database** (optional, use SQLite for free tier)
   ```powershell
   flyctl postgres create
   ```

5. **Set Secrets**
   ```powershell
   flyctl secrets set DISCORD_TOKEN=your_token
   flyctl secrets set PAYMENT_WALLET_ADDRESS=0xyouraddress
   ```

6. **Deploy**
   ```powershell
   flyctl deploy
   ```

### Deploying to Self-Hosted Server (VPS)

1. **Requirements**
   - Ubuntu 20.04+ or similar Linux
   - 512MB RAM minimum (1GB recommended)
   - 5GB disk space

2. **Setup Server**
   ```bash
   sudo apt update && sudo apt upgrade
   sudo apt install nodejs npm git
   git clone your-repo-url
   cd social-media-watcher-bot
   npm install
   npm run build
   ```

3. **Create Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your values
   ```

4. **Use PM2 for Auto-restart**
   ```bash
   sudo npm install -g pm2
   pm2 start dist/index.js --name "social-watcher"
   pm2 startup
   pm2 save
   ```

5. **Setup Logging**
   ```bash
   pm2 logs social-watcher
   ```

### Cost Comparison

| Hosting | Free Tier | Cost | Notes |
|---------|-----------|------|-------|
| **Railway** | 5 project hours/mo | $5+/mo | Good for small bots |
| **Render** | Limited (slow) | $7+/mo | Good uptime |
| **Fly.io** | 3 shared cores, 3GB | Free tier good | Most generous free tier |
| **VPS** (Linode) | None | $5+/mo | Most control |
| **Raspberry Pi** | One-time $35+ | Power only | Always-on at home |



## ❓ Common Issues

### "Cannot find module '@prisma/client'"

```powershell
npm run prisma:generate
```

### "Bot doesn't respond to slash commands"

1. Wait a few minutes (commands can take time to register)
2. Kick and re-invite the bot
3. Check bot has "Use Application Commands" permission
4. Try: `/register` (if available)

### "Payment not detected on Polygon"

1. Verify wallet address is correct in `.env`
2. Check POLYGON_RPC_URL is accessible
3. Verify payment was sent to correct address on Polygon network
4. Check bot logs: `pm2 logs social-watcher`
5. Wait 2-10 minutes (payment watcher checks every 2 minutes)

### "Instagram/TikTok not working"

These platforms use web scraping which is fragile:
- Platform may have changed their HTML structure
- You may be rate-limited
- Consider using the Twitter/Reddit/YouTube alternatives

### "ENOENT: no such file or directory, open 'prisma/dev.db'"

```powershell
npm run prisma:push
```

### "Discord Login Failed"

- Check your `DISCORD_TOKEN` in `.env`
- Make sure there are no spaces or quotes around the token
- Regenerate the token in Discord Developer Portal if needed
- Verify the token is for the correct bot application

### "Rate limited by platform"

Solutions:
1. Increase check interval in settings: `/settings interval`
2. Premium tier (faster checks) for fewer links
3. Use RSS feed alternatives when available

### "Bot keeps crashing"

Check logs:
```powershell
npm run dev  # Run in dev mode to see errors
```

Common causes:
- Missing `.env` variables
- Database corruption
- Memory leak (restart weekly)
- Network timeout (check RPC URL)

## 📊 Monitoring & Maintenance

### Check Bot Status

```powershell
# If running with PM2
pm2 status
pm2 logs social-watcher --tail 50

# If running in terminal
# Just watch the console output
```

### Restart Bot

```powershell
# PM2
pm2 restart social-watcher

# Manual
# Stop terminal (Ctrl+C) and run: npm run dev
```

### Update Bot

```powershell
git pull origin main
npm install
npm run build
npm run prisma:push  # Apply any schema changes
pm2 restart social-watcher
```

### Backup Database

```powershell
# SQLite
cp prisma/dev.db prisma/dev.db.backup

# PostgreSQL
pg_dump socialwatcher > backup.sql
```

## 🔐 Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Use `cp .env.example .env` only

2. **Secure Your Bot Token**
   - Treat like password
   - Regenerate if exposed
   - Use environment variables only

3. **Secure Crypto Wallet**
   - Keep private key safe
   - Use read-only wallet address for bot
   - Consider separate wallet just for bot
   - Monitor payments regularly

4. **Database Backups**
   - Regular automated backups
   - Store securely (not same server)
   - Test restores periodically

5. **Logs & Monitoring**
   - Rotate logs monthly
   - Monitor for suspicious activity
   - Set up alerts for errors



## 📞 Getting Help

If you're stuck:
1. Check the main README.md troubleshooting section
2. Review the console logs for error messages
3. Open an issue on GitHub with:
   - Your Node.js version (`node --version`)
   - The full error message
   - Steps to reproduce the problem

---

✅ **Setup Complete!** Your bot should now be running and ready to track social media accounts.
