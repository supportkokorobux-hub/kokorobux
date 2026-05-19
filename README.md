# Kusu 5 Day Robux Top Up

Website order top up Robux dengan form pembeli yang masuk ke Telegram admin.

## Jalankan Lokal

1. Buat bot Telegram lewat `@BotFather`, lalu ambil token bot.
2. Cari `chat_id` Telegram kamu. Cara cepat: kirim pesan ke bot, lalu buka:
   `https://api.telegram.org/botTOKEN_KAMU/getUpdates`
3. Salin `.env.example` menjadi `.env`.
4. Isi:

```env
TELEGRAM_BOT_TOKEN=token_bot_kamu
TELEGRAM_CHAT_ID=chat_id_kamu
PORT=3000
```

5. Jalankan:

```bash
npm start
```

Website akan aktif di `http://localhost:3000`.

## Ubah Paket

Daftar paket ada di `public/index.html` pada bagian `<select name="packageName">` dan kartu paket di bagian `.package-list`.
