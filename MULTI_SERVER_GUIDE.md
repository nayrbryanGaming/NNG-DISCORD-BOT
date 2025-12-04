# 🌐 Multi-Server Configuration Guide

Bot ini **fully support unlimited Discord servers** dengan **completely independent configuration** untuk setiap server.

## 📚 Konsep Dasar

### Setiap Server Punya:
✅ Setting sendiri (announcement channel, mode, timezone)  
✅ Link list sendiri (media yang di-track)  
✅ Database entry sendiri di Prisma  
✅ Premium status sendiri  
✅ Announcement history sendiri  

### Isolasi Data

```
Discord Servers:
│
├─ Server A (Gaming)
│  └─ Guild ID: 1234567890
│     ├─ announcement_channel: #gaming-news
│     ├─ Links: [YouTube MrBeast, TikTok nayrbryan, Twitter pokimane]
│     └─ Events: [50 announcements tracked]
│
├─ Server B (Music)
│  └─ Guild ID: 9876543210
│     ├─ announcement_channel: #music-updates
│     ├─ Links: [YouTube BillieEilish, Instagram TheWeeknd]
│     └─ Events: [20 announcements tracked]
│
└─ Server C (Tech)
   └─ Guild ID: 5555555555
      ├─ announcement_channel: #tech-releases
      ├─ Links: [Twitter LinusTechTips, Reddit r/technology]
      └─ Events: [75 announcements tracked]
```

## 🚀 Step-by-Step Setup (Multiple Servers)

### 1. Setup Server A (Gaming Community)

```
Server: Gaming Community
Owner: You
```

**Step 1: Add Bot ke Server A**
- Invite bot menggunakan URL
- Bot akan auto-create entry di database

**Step 2: Configure Server A**
```
/settings channel #gaming-announcements
/settings mode instant
```

**Step 3: Add Links untuk Server A**
```
/link add platform:YouTube url:https://www.youtube.com/@MrBeast
/link add platform:TikTok url:https://www.tiktok.com/@nayrbryangaming
/link add platform:Twitter url:https://twitter.com/@pokimane
```

**Verifikasi:**
```
/link list

Hasil:
1️⃣ YouTube - @MrBeast (active) - Last check: 2 min ago
2️⃣ TikTok - @nayrbryangaming (active) - Last check: 5 min ago
3️⃣ Twitter - @pokimane (active) - Last check: 8 min ago
```

---

### 2. Setup Server B (Music Fans)

```
Server: Music Fans Community
Owner: Someone else (atau server berbeda)
```

**Penting:** Bot bisa di-invite oleh orang berbeda atau account berbeda

**Step 1: Add Bot ke Server B**
- Orang lain invite bot ke server mereka
- Bot akan auto-create entry BARU di database untuk Guild B

**Step 2: Configure Server B** (BERBEDA dari Server A)
```
/settings channel #music-news
/settings mode summary
/settings interval 60
```

**Step 3: Add Links untuk Server B** (BERBEDA dari Server A)
```
/link add platform:YouTube url:https://www.youtube.com/@billieeilish
/link add platform:Instagram url:https://instagram.com/theweeknd
```

**Hasil:**
```
/link list

Output:
1️⃣ YouTube - @billieeilish (active)
2️⃣ Instagram - @theweeknd (active)

⚠️ PERHATIKAN: Tidak ada TikTok, Twitter, atau MrBeast
   (Setting berbeda dari Server A - hanya yang di-add di Server B)
```

---

### 3. Verifikasi Isolasi Data

Di **Server A**, jalankan:
```
/link list
→ MrBeast, nayrbryangaming, pokimane
→ Mode: instant
```

Ganti ke **Server B**, jalankan:
```
/link list
→ billieeilish, theweeknd
→ Mode: summary
```

**Hasil:** Link list BERBEDA! Mode BERBEDA! ✅

---

## 📊 Database Structure

### Tabel: `Guild`
```
id (Discord Guild ID) | name | announcement_channel | mode | subscription_status | created_at
123456 (Server A)     | Gaming | #gaming-news | instant | free | 2024-01-01
789012 (Server B)     | Music | #music-news | summary | free | 2024-01-02
```

### Tabel: `Link`
```
id | guild_id | platform | profile_handle | status | created_at
1 | 123456 | youtube | MrBeast | active | 2024-01-01
2 | 123456 | tiktok | nayrbryangaming | active | 2024-01-01
3 | 789012 | youtube | billieeilish | active | 2024-01-02
4 | 789012 | instagram | theweeknd | active | 2024-01-02
```

**Kunci penting:** Column `guild_id` membedakan data antar server!

---

## ⚙️ Advanced: Per-Server Management

### Pause Links hanya di Server A
```
(Di Server A)
/link pause 1
```

Server B tidak terpengaruh - link di Server B tetap active.

### Change Announcement Channel
```
(Di Server A)
/settings channel #announcements-new
```

Server B announcement channel tetap `#music-news`.

### Delete Link dari hanya Server B
```
(Di Server B)
/link remove 4
```

Link yang di-delete hanya ID 4 (theweeknd). Links di Server A tetap ada.

---

## 🔒 Security & Permissions

### Per-Server Permissions

Bot perlu permission berbeda di setiap server:
- **Server A:** Mungkin bot punya permission "Send Messages" tapi tidak "Manage Webhooks"
- **Server B:** Mungkin bot punya permission lebih lengkap

Setiap server manage permission bot-nya sendiri di:
```
Settings → Apps → Bots → [Bot Name] → Permissions
```

### Guild Isolation Logic (Kode)

Semua query pakai `where: { guild_id: interaction.guildId }`:

```typescript
// Get links HANYA dari server ini
const links = await db.link.findMany({
  where: { guild_id: interaction.guildId },  // ← Isolasi key
  orderBy: { created_at: 'desc' }
});

// Update settings HANYA untuk server ini
await db.guild.update({
  where: { id: interaction.guildId },  // ← Isolasi key
  data: { announcement_channel: channelId }
});
```

---

## 📈 Scaling to Many Servers

Bot dapat scale ke **1000+ servers** tanpa masalah:

- **Database:** SQLite → PostgreSQL (production) 
- **Performance:** Per-server interval checking efficiently implemented
- **Storage:** ~1KB per guild config, ~500B per link
- **Example:** 1000 servers × 10 links each = ~6MB database

---

## ❓ FAQ

**Q: Bisa bot di-invite ke unlimited servers?**  
A: Ya! Tidak ada limit server. Setiap server independent.

**Q: Jika owner server ganti setting, apakah server lain terpengaruh?**  
A: Tidak! Setiap server punya setting terpisah.

**Q: Link tracking di Server A apakah terlihat di Server B?**  
A: Tidak! Link list per-server. Hanya terlihat di server tempat link di-add.

**Q: Bisa share link setting antar server?**  
A: Tidak built-in, tapi bisa manual: `/link add` di server lain dengan URL yang sama.

**Q: Jika server delete bot, apakah data hilang?**  
A: Data tetap di database. Jika bot invite kembali, data akan restore.

---

## 🛠️ Commands Summary

| Command | Scope | Effect |
|---------|-------|--------|
| `/link add` | Current Server | Add link ke server ini |
| `/link list` | Current Server | Show links dari server ini saja |
| `/link remove` | Current Server | Remove link dari server ini |
| `/settings channel` | Current Server | Set channel untuk server ini |
| `/settings mode` | Current Server | Set mode untuk server ini |
| `/settings show` | Current Server | Show setting dari server ini |

---

## 📞 Support

Jika ada issue per-server:
1. Pastikan bot join ke server dengan proper permissions
2. Run `/settings show` di server yang problem
3. Check `/debug status` untuk diagnostics
4. Setiap error log mencatat `guild_id` untuk tracking

---

**Last Updated:** 2024-12-04  
**Version:** 1.0 - Multi-Server Stable
