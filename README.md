# Social Media Watcher Discord Bot

A Discord bot that automatically monitors social media profiles and announces new content to Discord channels. Supports YouTube, Twitter/X, and more platforms (premium).

## 🌟 Features

### Free Tier
- ✅ Track up to **3 social media profiles** per server
- ✅ Check for new content every **10 minutes**
- ✅ **YouTube** and **Twitter/X** support
- ✅ Instant announcements with rich embeds
- ✅ Easy slash command interface

### Premium Tier ($5/month)
- 💎 Track up to **50 profiles** per server
- 💎 Check every **1 minute** for real-time updates
- 💎 **All platforms** supported (Instagram, TikTok, Reddit, Telegram, etc.)
- 💎 AI-powered summaries (coming soon)
- 💎 Custom branding and announcement styles

## 📋 Requirements

- Node.js 18+ or 20+
- Discord Bot Token ([Get one here](https://discord.com/developers/applications))
- Optional: YouTube API Key (free tier: 10,000 requests/day)

## 🚀 Quick Start

### 1. Clone and Install

```powershell
# Clone the repository
git clone <your-repo-url>
cd social-media-watcher-bot

# Install dependencies
npm install

# Create database directory
mkdir data
```

### 2. Configure Environment

```powershell
# Copy the example environment file
cp .env.example .env

# Edit .env with your favorite editor
notepad .env
```

Required environment variables:
```env
DISCORD_TOKEN=your_discord_bot_token_here
DATABASE_URL="file:./data/bot.db"
NODE_ENV=development
YOUTUBE_API_KEY=your_youtube_api_key_here  # Optional but recommended
```

### 3. Setup Database

```powershell
# Generate Prisma client
npm run prisma:generate

# Create database and run migrations
npm run prisma:push
```

### 4. Run the Bot

```powershell
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

## 📝 Discord Bot Setup

### Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Social Media Watcher")
4. Go to the "Bot" tab
5. Click "Add Bot"
6. Copy the token and add it to `.env` as `DISCORD_TOKEN`

### Bot Permissions

Your bot needs these permissions:
- ✅ Send Messages
- ✅ Embed Links
- ✅ Read Message History
- ✅ Use Slash Commands

Permission Integer: `274878024704`

### Invite Bot to Your Server

Use this URL format (replace `YOUR_CLIENT_ID`):
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024704&scope=bot%20applications.commands
```

Find your Client ID in the Discord Developer Portal under "OAuth2" → "Client ID"

## 🎮 Usage

### Basic Commands

#### `/start`
Show welcome message with bot information and available commands.

#### `/link add <platform> <url>`
Add a social media profile to track.

Examples:
```
/link add platform:YouTube url:https://youtube.com/@MrBeast
/link add platform:Twitter url:https://twitter.com/elonmusk
```

#### `/link list`
Show all tracked links for your server.

#### `/link remove <id>`
Remove a tracked link by ID (get ID from `/link list`).

#### `/link pause <id>` / `/link resume <id>`
Temporarily pause/resume a tracked link.

### Settings Commands

#### `/settings channel <#channel>`
Set the default announcement channel.

#### `/settings mode <instant|summary>`
Choose between instant announcements or summary mode.

#### `/settings interval <15m|1h|6h>`
Set how often summaries are posted (summary mode only).

#### `/settings show`
Display current server settings.

### Premium Commands

#### `/premium info`
Show premium tier information and subscription status.

#### `/premium subscribe`
Subscribe to premium (crypto payment - coming in Phase 3).

### Debug Commands

#### `/debug status`
Show bot status, statistics, and health information.

#### `/debug errors <limit>`
Show recent error logs (admin only).

## 🌐 Multi-Server Configuration (Per-Server Unique Setup)

**Fitur utama:** Setiap server memiliki setting dan link tracking yang **completely independent**. Bot support unlimited servers!

### Cara Kerja Per-Server Configuration

1. **Bot join ke Server A** → Database buat entry baru untuk "Guild A"
2. **Bot join ke Server B** → Database buat entry baru untuk "Guild B"
3. **Tiap server punya setting sendiri** (announcement channel, mode, interval)
4. **Tiap server punya link list sendiri** (media yang di-track berbeda)

### Contoh Skenario (3 Server)

```
Server A "Gaming Community":
├── Announcement Channel: #gaming-news
├── Mode: instant
├── Links: 
│   ├── YouTube: MrBeast
│   ├── TikTok: @nayrbryangaming
│   └── Twitter: @pokimane

Server B "Music Fans":
├── Announcement Channel: #music-updates
├── Mode: summary (every 1 hour)
├── Links:
│   ├── YouTube: Billie Eilish
│   └── Instagram: The Weeknd

Server C "Tech News":
├── Announcement Channel: #tech-releases
├── Mode: instant
├── Links:
│   ├── Twitter: Linus Tech Tips
│   ├── Reddit: r/technology
│   └── YouTube: Marques Brownlee
```

### Database Isolation

Setiap server menyimpan:
- **Guild config** (announcement_channel, timezone, announcement_mode, subscription_status)
- **User links** per server (berbeda dengan server lain)
- **Link events** tracking per server (announcements history)

Struktur database:
```
Guilds Table:
  id (Discord Guild ID) | announcement_channel | timezone | mode | subscription_status
  1234567890            | #announcements       | UTC      | instant | free
  9876543210            | #news                | WIB      | summary | free

Links Table:
  id | guild_id | platform | profile_url | status
  1  | 1234567890 | youtube | ... | active
  2  | 1234567890 | tiktok  | ... | active
  3  | 9876543210 | twitter | ... | paused
```

### Setup Ulang di Server Berbeda

Ketika bot join ke server baru:

```powershell
# Command di Server A
/settings channel #anime-news
/link add platform:YouTube url:https://youtube.com/@TechChannel

# Kemudian invite bot ke Server B
/settings channel #general-updates          # BERBEDA dari Server A
/link add platform:YouTube url:https://youtube.com/@GamingChannel  # BERBEDA profile

# Server A tetap pakai setting lamanya, tidak terpengaruh setting Server B
```

### Permission Requirements

Bot perlu permission ini di **setiap server**:
- `Send Messages` → post announcements
- `Embed Links` → format dengan rich embeds
- `Read Message History` → track announcement history
- `Use Application Commands` → slash commands

Set permissions di **Server Settings → Roles → Bot Role** atau biarkan saat invite dengan URL di atas.


## 🏗️ Project Structure

```
social-media-watcher-bot/
├── src/
│   ├── index.ts                 # Main bot entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── commands/                # Slash command handlers
│   │   ├── index.ts
│   │   ├── start.ts
│   │   ├── link.ts
│   │   ├── settings.ts
│   │   ├── premium.ts
│   │   └── debug.ts
│   ├── fetchers/                # Platform content fetchers
│   │   ├── index.ts
│   │   ├── youtube.ts
│   │   └── twitter.ts
│   ├── workers/                 # Background job workers
│   │   ├── watcher.ts           # Main content watcher loop
│   │   ├── payment-watcher.ts   # Crypto payment processor (Phase 3)
│   │   └── subscription-expiry.ts
│   └── utils/                   # Utility functions
│       ├── logger.ts            # Winston logger
│       ├── embeds.ts            # Discord embed builders
│       └── database.ts          # Database helpers
├── prisma/
│   └── schema.prisma            # Database schema
├── .env.example                 # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Development

### Available Scripts

```powershell
npm run dev              # Run in development mode with ts-node
npm run build            # Compile TypeScript to JavaScript
npm start                # Run compiled JavaScript (production)
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Create a new migration
npm run prisma:push      # Push schema to database (no migration)
npm run prisma:studio    # Open Prisma Studio (database GUI)
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript types without compiling
```

### Database Management

View and edit database using Prisma Studio:
```powershell
npm run prisma:studio
```

This opens a web interface at `http://localhost:5555` where you can browse and edit database records.

## 📊 Supported Platforms

| Platform | Status | Tier | Method | Reliability |
|----------|--------|------|--------|-------------|
| YouTube | ✅ Active | Free | RSS Feed + API | ⭐⭐⭐⭐⭐ |
| Twitter/X | ✅ Active | Free | Nitter (proxy) | ⭐⭐⭐⭐ |
| Instagram | 🔜 Coming | Premium | Instaloader | ⭐⭐⭐ |
| Reddit | 🔜 Coming | Premium | JSON endpoint | ⭐⭐⭐⭐⭐ |
| Telegram | 🔜 Coming | Premium | Web preview API | ⭐⭐⭐⭐ |
| TikTok | 🔜 Coming | Premium | Unofficial API | ⭐⭐⭐ |

## 🐛 Troubleshooting

### Bot doesn't respond to commands

1. Check that the bot is online in your server
2. Verify the bot has "Use Application Commands" permission
3. Check the console for errors
4. Try kicking and re-inviting the bot

### "Failed to fetch YouTube content"

1. Verify the YouTube API key is set in `.env` (optional but helps)
2. Check the channel URL is correct (use full URL)
3. Make sure the channel is public
4. Check console logs for detailed error message

### "All Nitter instances failed"

Twitter/X fetching relies on Nitter proxies which can be unreliable:
1. This is expected occasionally
2. The bot will retry on the next check cycle
3. Consider self-hosting a Nitter instance for reliability

### Database errors

```powershell
# Reset database (WARNING: deletes all data)
rm data/bot.db
npm run prisma:push
```

## 📝 Deployment

### Option 1: Railway (Recommended)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL: `railway add postgresql`
5. Update `.env` with Railway's `DATABASE_URL`
6. Deploy: `railway up`

### Option 2: Self-Hosted (Raspberry Pi, VPS, etc.)

```powershell
# Build the project
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name social-watcher
pm2 startup
pm2 save

# View logs
pm2 logs social-watcher
```

### Option 3: Docker (Coming Soon)

## 🛣️ Roadmap

### Phase 1: MVP ✅ (Current)
- [x] Core Discord bot with slash commands
- [x] YouTube tracking via RSS
- [x] Twitter/X tracking via Nitter
- [x] Basic announcement embeds
- [x] Free tier limits (3 links, 10-min interval)
- [x] SQLite database

### Phase 2: Multi-Platform (Next)
- [ ] Instagram support (premium)
- [ ] Reddit support
- [ ] Telegram channel support
- [ ] Summary announcement mode
- [ ] Better error handling and retries
- [ ] PostgreSQL support

### Phase 3: Premium & Payments
- [ ] Crypto payment processor (Polygon USDC/USDT)
- [ ] Automatic subscription management
- [ ] Premium tier activation
- [ ] AI-powered content summaries
- [ ] Custom branding options

### Phase 4: Polish & Dashboard
- [ ] Web dashboard (Next.js)
- [ ] Analytics and statistics
- [ ] Better onboarding flow
- [ ] Multi-language support
- [ ] Advanced notification customization

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

Need help? 
- Open an issue on GitHub
- Join our Discord server (coming soon)
- Check the troubleshooting section above

## ⚠️ Disclaimer

This bot uses publicly available data from social media platforms. Please ensure you comply with each platform's Terms of Service. We are not responsible for any violations or issues that may arise from using this bot.

---

Built with ❤️ using TypeScript, Discord.js, and Prisma
