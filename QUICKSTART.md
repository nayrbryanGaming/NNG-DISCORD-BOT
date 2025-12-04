# QUICKSTART.md - Get Running in 5 Minutes

## 🚀 TL;DR Fast Track

### 1. Create Discord Bot
Visit https://discord.com/developers/applications:
- "New Application" → name it "Social Watcher"
- "Bot" tab → "Add Bot"
- Copy the token, save as secret
- Copy Client ID

### 2. Get Code
```powershell
git clone <repo-url>
cd social-media-watcher-bot
```

### 3. Install & Configure
```powershell
npm install
cp .env.example .env
```

Edit `.env`:
```env
DISCORD_TOKEN=paste_your_token_here
DISCORD_CLIENT_ID=paste_client_id_here
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=development
```

### 4. Setup Database
```powershell
npm run prisma:push
```

### 5. Invite Bot to Server
Replace `YOUR_CLIENT_ID`:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878024704&scope=bot%20applications.commands
```

Paste in browser, select server, authorize.

### 6. Run
```powershell
npm run dev
```

Wait for: `✅ Bot is fully operational!`

## 🎮 Test It

In Discord server:

```
/start
```

Bot responds with welcome message ✓

```
/link add
```

- Platform: YouTube
- URL: https://www.youtube.com/@YouTube
- Types: Posts only
- Channel: #announcements (or your channel)

Wait 1 minute → Bot checks YouTube

When YouTube posts → You get announcement in Discord! 🎉

## 📱 Supported Platforms

Add any of these:
- YouTube: `https://www.youtube.com/@channelname`
- Twitter: `https://x.com/username`
- Reddit: `https://reddit.com/r/subreddit`
- Telegram: `https://t.me/channelname`
- Instagram: `https://instagram.com/username` (best effort)
- TikTok: `https://tiktok.com/@username` (best effort)

## 💰 Premium Tier (Optional)

To accept crypto payments:

1. Generate wallet: https://metamask.io/
2. Add to `.env`:
```env
ENABLE_CRYPTO_PAYMENTS=true
PAYMENT_WALLET_ADDRESS=0xyourwalletaddress
```
3. Restart bot
4. Users run `/premium subscribe` → see payment details
5. When they send USDC/USDT on Polygon → auto-enabled!

## 📚 Full Guides

- **Setup**: See `SETUP_GUIDE.md` for detailed instructions
- **Deployment**: See `SETUP_GUIDE.md` "Advanced Configuration"
- **Features**: See `README.md` for full command reference

## ⚠️ Common First-Time Issues

| Problem | Solution |
|---------|----------|
| Slash commands don't work | Wait 5 min, kick/re-invite bot |
| Bot crashes on startup | Check DISCORD_TOKEN in .env |
| Database errors | Run: `npm run prisma:push` |
| "Cannot find module" | Run: `npm run prisma:generate` |

## 📞 Next Steps

After getting it running:

1. ✅ Add all your favorite channels/accounts
2. ✅ Customize announcement style: `/settings mode instant|summary`
3. ✅ Set announcement channel: `/settings channel #announcements`
4. ✅ Enable premium and set up crypto payments (optional)
5. ✅ Deploy to production (Railway/Render/Fly.io/VPS)

## 🎓 Learn More

- Discord.js docs: https://discord.js.org/
- Prisma docs: https://www.prisma.io/docs/
- Node.js: https://nodejs.org/docs/

---

**Issues?** Check SETUP_GUIDE.md "Common Issues" section or open a GitHub issue.
