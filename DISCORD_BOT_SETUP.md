# Discord Bot Setup Guide (Live Integration)

## 🎯 Overview
Deploy bot Discord yang bisa:
- **Real-time commands** (`/link add`, `/link list`, `/start`)
- **Auto-check Instagram** setiap 4 jam
- **Direct Discord integration** tanpa GitHub Actions

---

## 📋 Prerequisites

1. **Discord Bot Token** (sudah ada)
2. **Discord Application ID** (sudah ada)
3. **Server untuk hosting** (pilih salah satu):
   - Railway.app (FREE, 500 hours/bulan)
   - Render.com (FREE, auto-sleep setelah 15 menit)
   - VPS (DigitalOcean, Vultr, dll)

---

## 🚀 Quick Setup

### Step 1: Setup Database
```bash
npm install
npx prisma generate
npx prisma db push
```

### Step 2: Setup Environment Variables
Create `.env` file:
```env
DISCORD_TOKEN=your_discord_token_here
DISCORD_CLIENT_ID=your_client_id_here
DATABASE_URL="file:./dev.db"
NODE_ENV=production
```

### Step 3: Register Commands
```bash
npm run deploy-commands
```

### Step 4: Start Bot
```bash
npm start
```

---

## 🎮 Discord Commands

### `/start`
Initialize bot untuk server kamu

### `/link add <platform> <username> <channel>`
Tambah link Instagram/YouTube/Twitter
- **platform**: `instagram`, `youtube`, `twitter`, `tiktok`, `reddit`, `telegram`
- **username**: Username akun (contoh: `uajm_esports`)
- **channel**: Channel Discord untuk notifikasi

### `/link list`
Lihat semua link yang aktif

### `/link remove <id>`
Hapus link berdasarkan ID

### `/link pause <id>`
Pause link sementara

### `/link resume <id>`
Resume link yang di-pause

### `/settings`
Lihat settings server

### `/premium`
Info premium features

---

## 🔧 Deployment Options

### Option 1: Railway.app (RECOMMENDED - FREE)
1. Sign up: https://railway.app/
2. Create new project → "Deploy from GitHub"
3. Connect repo: `NNG-DISCORD-BOT`
4. Add environment variables:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `DATABASE_URL` (Railway auto-provides PostgreSQL)
5. Deploy!

**Start Command:**
```
npm run build && npm start
```

### Option 2: Render.com (FREE with limitations)
1. Sign up: https://render.com/
2. New Web Service → Connect GitHub
3. Build Command: `npm install && npm run build`
4. Start Command: `node dist/index.js`
5. Add env variables
6. Deploy!

⚠️ **Note**: Render free tier auto-sleeps after 15 min inactivity

### Option 3: Local PC (Development)
```bash
# Keep terminal open
npm run dev
```

---

## 📊 Features

### ✅ Working Now
- Discord bot commands
- Database integration (SQLite/PostgreSQL)
- Command registration
- Error handling

### 🔧 Need to Enable
- Instagram checker (scheduler)
- Payment watcher
- Subscription management

---

## 🐛 Troubleshooting

### Bot not responding?
1. Check bot is online in Discord
2. Check permissions (Administrator or specific perms)
3. Run `/start` first to initialize server

### Commands not showing?
```bash
npm run deploy-commands
```

### Database errors?
```bash
npx prisma generate
npx prisma db push
```

---

## 📝 Next Steps

1. **Deploy ke Railway/Render**
2. **Enable scheduler** (Instagram checker)
3. **Test commands** di Discord server
4. **Add more platforms** (YouTube, Twitter, dll)

---

## 💡 Tips

- Use Railway untuk 24/7 uptime (FREE 500 jam/bulan)
- PostgreSQL lebih reliable untuk production
- Enable logging untuk debug
- Backup database regular

---

## 🔗 Useful Links

- Discord Developer Portal: https://discord.com/developers/applications
- Railway Dashboard: https://railway.app/dashboard
- Render Dashboard: https://dashboard.render.com/
- Prisma Docs: https://www.prisma.io/docs

---

**Ready to deploy?** Choose deployment method above and GAS! 🚀
