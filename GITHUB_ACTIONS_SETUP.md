# Instagram Auto Checker (GitHub Actions)

✅ **100% Free, No Server Needed**

Auto-check Instagram accounts dan kirim notif ke Discord via Webhook setiap jam 00, 08, 12, 16, 20 WITA.

## 🚀 Setup

### 1. Add GitHub Secret

1. Buka repo di GitHub: `Settings` → `Secrets and variables` → `Actions`
2. Click `New repository secret`
3. Name: `WEBHOOK_CONFIG`
4. Value (format JSON):
```json
[
  {
    "username": "uajm_esports",
    "webhook": "https://discord.com/api/webhooks/1446148009724350484/QSEV0O05j1f2kGlGnk3ZmwJEFXUlTRU36AMBOci4gAQvzO9FqcOTm_2BdzoZXXNC7sEd"
  }
]
```

### 2. Enable GitHub Actions

1. Buka repo di GitHub: `Actions` tab
2. Click `I understand my workflows, go ahead and enable them`

### 3. Test Manual Run

1. Di tab `Actions`, click workflow `Instagram Post Checker`
2. Click `Run workflow` → `Run workflow`
3. Tunggu 1-2 menit, check Discord channel kamu

## 📅 Schedule

Otomatis jalan setiap:
- 00:00 WITA (16:00 UTC hari sebelumnya)
- 08:00 WITA (00:00 UTC)
- 12:00 WITA (04:00 UTC)
- 16:00 WITA (08:00 UTC)
- 20:00 WITA (12:00 UTC)

## ➕ Tambah Akun Instagram Lain

Edit GitHub Secret `WEBHOOK_CONFIG`, tambahkan entry baru:

```json
[
  {
    "username": "uajm_esports",
    "webhook": "https://discord.com/api/webhooks/YOUR_WEBHOOK_1"
  },
  {
    "username": "another_account",
    "webhook": "https://discord.com/api/webhooks/YOUR_WEBHOOK_2"
  }
]
```

Setiap akun bisa punya webhook berbeda = Discord server/channel berbeda!

## 🔧 How It Works

1. GitHub Actions run script `check-instagram.js` sesuai jadwal
2. Script check latest post dari setiap Instagram account
3. Compare dengan post terakhir (disimpan di `data/last-posts.json`)
4. Jika ada post baru → kirim notif ke Discord Webhook
5. Save post ID terbaru untuk check berikutnya

## ⚠️ Limitations

- Instagram bisa block scraping, jadi ada fallback mode
- Free GitHub Actions quota: 2000 menit/bulan (lebih dari cukup)
- Rate limit: delay 2 detik antar check account

## 💡 Tips

- First run akan kirim notif untuk post terakhir yang ada
- Setelah itu hanya notif post baru
- Webhook bisa digunakan untuk banyak server Discord
- Bisa tambah unlimited accounts (selama dalam GitHub Actions quota)
