# ARCHITECTURE.md - System Design & Implementation

## 📐 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Server                           │
│  User runs: /link add → Bot responds with options           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Discord Bot Core (discord.js v14)                │
│  ├─ Command Handler (slash commands)                        │
│  ├─ Interaction Responses (embeds, buttons)                 │
│  └─ Event Listeners (ready, guildCreate, etc.)              │
└────────────┬──────────────────────────┬──────────────────────┘
             │                          │
             ▼                          ▼
    ┌──────────────────┐      ┌─────────────────────┐
    │ Scheduler System │      │    Fetcher System   │
    │                  │      │                     │
    │ 1. Content Watch │ ────→├ YouTube (RSS+API)   │
    │ (every minute)   │      ├ Twitter (Nitter)    │
    │                  │      ├ Instagram (Scrape)  │
    │ 2. Payment Watch │ ────→├ Reddit (JSON API)   │
    │ (every 2 min)    │      ├ TikTok (Scrape)     │
    │                  │      └ Telegram (Bot API)  │
    │ 3. Expiry Check  │
    │ (daily midnight) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────┐
    │  Platform APIs       │
    │                      │
    │ External Services:   │
    │ - YouTube.com (RSS)  │
    │ - Nitter.net         │
    │ - Reddit.com (API)   │
    │ - Instagram.com      │
    │ - TikTok.com         │
    │ - Telegram (Bot API) │
    │ - Polygon RPC        │
    └──────────────────────┘
             │
             ▼
    ┌──────────────────────┐
    │  Database (Prisma)   │
    │  ├─ Guilds           │
    │  ├─ Links            │
    │  ├─ LinkEvents       │
    │  ├─ Subscriptions    │
    │  ├─ Payments         │
    │  └─ SystemLogs       │
    └──────────────────────┘
```

## 🏗️ Directory Structure

```
src/
├── index.ts                 # Main bot entry point
├── types.ts                 # TypeScript interfaces & enums
├── commands/                # Slash command handlers
│   ├── start.ts            # /start - Welcome message
│   ├── link.ts             # /link - Add/manage links
│   ├── settings.ts         # /settings - Configure guild
│   ├── premium.ts          # /premium - Subscription flow
│   └── debug.ts            # /debug - Admin commands
├── fetchers/               # Platform-specific fetchers
│   ├── index.ts            # Dispatcher & router
│   ├── youtube.ts          # YouTube RSS+API
│   ├── twitter.ts          # Twitter via Nitter
│   ├── instagram.ts        # Instagram (web scraping)
│   ├── tiktok.ts           # TikTok (web scraping)
│   ├── reddit.ts           # Reddit public API
│   └── telegram.ts         # Telegram Bot API
├── services/
│   └── scheduler.ts        # Cron job coordinator
├── workers/                # Background jobs
│   ├── watcher.ts          # Main content poller
│   ├── payment-watcher.ts  # Polygon payment monitor
│   └── subscription-expiry.ts # Expiry checker
└── utils/
    ├── logger.ts           # Winston logging
    ├── embeds.ts           # Discord embed builders
    └── database.ts         # Prisma helpers

prisma/
├── schema.prisma           # Database schema
└── migrations/             # Database migrations (auto-generated)

.env                        # Environment variables (git ignored)
.env.example                # Template for .env
package.json                # Dependencies & scripts
tsconfig.json               # TypeScript config
QUICKSTART.md               # 5-minute setup guide
SETUP_GUIDE.md              # Detailed setup instructions
README.md                   # Feature documentation
ARCHITECTURE.md             # This file
```

## 🔄 Data Flow: Adding a Link

```
User in Discord
      │
      ▼
/link add command received
      │
      ├─ Extract URL (e.g., youtube.com/@MrBeast)
      │
      ├─ Detect platform (YouTube)
      │
      ├─ Validate URL format
      │
      ├─ Check free tier quota (3 links max)
      │
      ├─ Create Link record in database:
      │  ├─ guild_id
      │  ├─ platform
      │  ├─ profile_url
      │  ├─ profile_handle (@MrBeast)
      │  ├─ status: "active"
      │  └─ content_types: ["posts", "videos"]
      │
      └─ Send confirmation to user:
         "✅ Added YouTube channel @MrBeast"
         "Checking for new content every 10 minutes"
```

## 🎬 Data Flow: Checking for New Content

**Runs every minute** (from `workers/watcher.ts`):

```
Cron job triggered (every 1 minute)
      │
      ├─ Get all active links from database
      │
      ├─ For each link:
      │  │
      │  ├─ Fetch platform content:
      │  │  └─ Call fetcher (e.g., fetchYoutube())
      │  │     ├─ Parse RSS/API
      │  │     ├─ Extract latest posts
      │  │     └─ Return [PlatformContent, ...]
      │  │
      │  ├─ Compare with last_seen_id:
      │  │  ├─ If same → no new content
      │  │  └─ If different → new content found!
      │  │
      │  ├─ For each NEW post:
      │  │  ├─ Create LinkEvent record
      │  │  ├─ Build announcement embed
      │  │  ├─ Send to announcement_channel
      │  │  └─ Update last_seen_id
      │  │
      │  ├─ Update last_check timestamp
      │  │
      │  └─ If error → set status: "error"
      │
      └─ Log completion
```

## 💰 Data Flow: Payment Processing

**Runs every 2 minutes** (from `workers/payment-watcher.ts`):

```
Cron job triggered (every 2 minutes)
      │
      ├─ Connect to Polygon RPC
      │
      ├─ Get current block number
      │
      ├─ For each token (USDC, USDT):
      │  │
      │  ├─ Query Transfer events:
      │  │  └─ TO: your PAYMENT_WALLET_ADDRESS
      │  │
      │  ├─ For each new transfer:
      │  │  │
      │  │  ├─ Extract:
      │  │  │  ├─ sender address
      │  │  │  ├─ amount (in wei)
      │  │  │  └─ tx_hash
      │  │  │
      │  │  ├─ Find matching pending payment:
      │  │  │  └─ Match by amount (within 0.01 tolerance)
      │  │  │
      │  │  ├─ Update payment record:
      │  │  │  ├─ status: "confirmed"
      │  │  │  ├─ tx_hash
      │  │  │  └─ wallet_address
      │  │  │
      │  │  └─ Activate premium:
      │  │     ├─ Set guild.subscription_status = "premium"
      │  │     ├─ Set guild.premium_expires = now + 30 days
      │  │     └─ Update subscription record
      │  │
      │  └─ Update last_checked_block[token]
      │
      └─ Log results
```

## 🗄️ Database Schema

### Core Models

```prisma
Guild {
  id: String (Discord Guild ID)
  announcement_channel: String?
  timezone: String (default: "UTC")
  announcement_mode: String ("instant" | "summary")
  summary_interval: Int (minutes)
  subscription_status: String ("free" | "premium")
  premium_expires: DateTime?
  links: Link[]
  subscriptions: Subscription[]
}

User {
  id: String (Discord User ID)
  username: String
  avatar_url: String?
  links: Link[]
  payments: Payment[]
}

Link {
  id: UUID
  guild_id: String (FK)
  platform: String ("youtube", "twitter", "instagram", etc.)
  profile_url: String
  profile_handle: String (e.g., "@MrBeast")
  profile_id: String? (platform-specific ID)
  content_types: String (JSON array: ["posts", "videos", "stories"])
  last_check: DateTime?
  last_seen_id: String?
  status: String ("active" | "error" | "paused")
  error_message: String?
  error_count: Int
  events: LinkEvent[]
}

LinkEvent {
  id: UUID
  link_id: UUID (FK)
  content_id: String (platform-specific: video ID, tweet ID, etc.)
  content_type: String ("video" | "post" | "tweet" | "reel")
  title: String?
  description: String?
  media_url: String?
  url: String (direct link to content)
  published_at: DateTime
  announced_at: DateTime?
  created_at: DateTime
}

Subscription {
  id: UUID
  guild_id: String (FK)
  tier: String ("free" | "premium")
  status: String ("active" | "expired" | "pending")
  starts_at: DateTime?
  expires_at: DateTime?
  payments: Payment[]
}

Payment {
  id: UUID
  subscription_id: UUID (FK)
  user_id: String (FK)
  method: String ("crypto" | "midtrans")
  amount: Float
  currency: String ("USDC" | "USDT" | "IDR")
  blockchain: String? ("polygon" | "ethereum" | "solana")
  tx_hash: String? (unique)
  wallet_address: String? (sender)
  unique_amount: Float? (for matching)
  status: String ("pending" | "confirmed" | "failed")
  created_at: DateTime
  confirmed_at: DateTime?
}

PlatformConfig {
  platform: String (primary key)
  enabled: Boolean
  tier: Int (1 = free, 2 = premium only)
  rate_limit_per_hour: Int
  cache_duration_secs: Int
}

SystemLog {
  id: UUID
  level: String ("debug", "info", "warn", "error")
  category: String ("watcher", "payment", "command", etc.)
  message: String
  metadata: String? (JSON)
  created_at: DateTime
}
```

## 🔐 Free vs Premium Tiers

| Feature | Free | Premium |
|---------|------|---------|
| Max links/guild | 3 | 50 |
| Check interval | 10 min | 2 min |
| Platforms | 6 | 6 |
| AI summaries | ❌ | ✅ (Phase 4) |
| Custom branding | ❌ | ✅ (Phase 4) |
| Cost | Free | ~$5/month or ~$50 USDC |

## 🚨 Error Handling Strategy

### Content Fetcher Errors
```
Try to fetch → Error occurs
      ↓
Log error with platform/URL
      ↓
Increment error_count
      ↓
If error_count > 5:
  Set status = "error"
  Notify guild admin
Else:
  Retry next check cycle
```

### Payment Watcher Errors
```
RPC connection fails → Log error
      ↓
Use backup RPC providers (failover)
      ↓
If all fail → Skip this cycle, retry in 2 min
      ↓
No error notification (payment watcher is non-critical)
```

### Command Errors
```
User runs /link add with invalid URL
      ↓
Validate URL format
      ↓
If invalid:
  Return error embed to user
  Explain what went wrong
Else:
  Proceed with link creation
```

## 📊 Rate Limiting Strategy

### Per-Platform
- **YouTube**: 10,000 units/day (API quota)
- **Twitter/Nitter**: ~100 req/min per IP
- **Reddit**: 60 requests/min
- **Instagram**: Aggressive rate limiting (unavoidable without auth)
- **TikTok**: Rate limited (best effort only)
- **Telegram**: 30 msg/sec per account

### Bot-Level
- Cache responses for 5 minutes per link
- Spread checks across 1-minute intervals
- Implement exponential backoff on 429 errors
- Reduce check frequency per link on errors

## 🔄 Deployment Architecture

```
Local Development
    ↓
npm run dev
    ↓
Runs on http://localhost:3000 (not a web server)
Connects to local SQLite database

Production Deployment (Railway/Render/Fly.io)
    ↓
npm run build → Creates dist/ folder
    ↓
npm start → Runs compiled JavaScript
    ↓
Connects to PostgreSQL database
    ↓
Background workers run automatically
```

## 🛠️ Technology Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Bot Framework | discord.js v14 | Most popular, well-documented |
| Language | TypeScript | Type safety, better DX |
| Database | Prisma ORM | Type-safe, supports SQLite/PostgreSQL |
| Scheduler | node-cron | Simple, reliable cron syntax |
| HTTP Client | axios | Clean API, good error handling |
| Web Parsing | cheerio | jQuery-like API for HTML/XML |
| Logging | winston | Structured logging, multiple transports |
| Crypto | ethers.js v6 | Official Ethereum/Polygon library |
| Environment | dotenv | Clean env var management |

## 📈 Performance Considerations

### Memory Usage
- Per 100 links: ~50MB (rough estimate)
- Base: ~150MB
- Max recommended: 500 links (~400MB)

### Database Performance
- Index on: guild_id, platform, status, content_id
- Cascade delete on link removal
- Unique constraint on (guild_id, platform, profile_id)

### API Calls
- Per minute: ~N calls where N = number of active links
- Per day: ~1,440 × N calls
- Optimized with caching (5min per link)

## 🔮 Future Improvements

### Phase 4 (Web Dashboard)
- React frontend for guild management
- Payment history view
- Link statistics/analytics
- Multi-guild admin dashboard

### Phase 5 (Advanced Features)
- AI content summarization
- Machine learning for content tagging
- Custom filters & keyword monitoring
- Webhook integrations

### Phase 6 (Scaling)
- Distributed scheduler (Redis)
- Microservices architecture
- CDN for media
- Sharding for 1000+ servers

---

**Last Updated**: December 4, 2025
**Status**: Phase 2 (Multi-platform) complete, Phase 3 (Premium) in progress
