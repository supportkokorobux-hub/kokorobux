const http = require("http");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

loadEnv();

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/order") {
      await handleOrder(req, res);
      return;
    }

    if (req.method !== "GET") {
      sendJson(res, 405, { ok: false, message: "Method tidak didukung." });
      return;
    }

    serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, message: "Server sedang bermasalah. Coba lagi sebentar." });
  }
});

server.listen(PORT, () => {
  console.log(`Kusu Robux Topup running at http://localhost:${PORT}`);
});

async function handleOrder(req, res) {
  const body = await readJson(req);
  const order = sanitizeOrder(body);
  const missing = validateOrder(order);

  if (missing.length) {
    sendJson(res, 400, {
      ok: false,
      message: `Mohon lengkapi: ${missing.join(", ")}.`
    });
    return;
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    sendJson(res, 500, {
      ok: false,
      message: "Telegram belum dikonfigurasi. Isi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di file .env."
    });
    return;
  }

  const message = formatTelegramMessage(order);
  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const telegramResponse = await fetch(telegramUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  const telegramResult = await telegramResponse.json().catch(() => ({}));

  if (!telegramResponse.ok || !telegramResult.ok) {
    console.error("Telegram error:", telegramResult);
    sendJson(res, 502, {
      ok: false,
      message: "Order belum terkirim ke Telegram. Periksa token bot dan chat ID."
    });
    return;
  }
await transporter.sendMail({
  from: EMAIL_USER,
  to: order.email,
  subject: "Pesanan Sedang Diproses",
  html: `
    <h2>Pesanan Berhasil Diterima</h2>

    <p>Halo ${order.buyerName}</p>

    <p>Pesanan Robux kamu sedang diproses admin.</p>

    <p>Terima kasih sudah order 🙌</p>
  `
});

  sendJson(res, 200, {
    ok: true,
    message: "Order masuk. Admin akan proses manual lewat Telegram."
  });
}

function sanitizeOrder(body) {
  const robloxUsername = clean(body.robloxUsername || body.username);
  const email = clean(body.email);
  const packageName = clean(body.packageName);
  const amount = clean(body.amount);
  const price = clean(body.price);
  const packageLabel = [packageName, amount, price].filter(Boolean).join(" | ");

  return {
    buyerName: clean(body.buyerName || body.name || "-"),
    email,
    robloxUsername,
    packageName: packageLabel || packageName,
    paymentMethod: clean(body.paymentMethod || body.payment),
    note: clean(body.note || "-")
  };
}

function validateOrder(order) {
  const required = {
    email: "Email",
    robloxUsername: "Username Roblox",
    packageName: "Paket Robux",
    paymentMethod: "Metode pembayaran"
  };

  return Object.entries(required)
    .filter(([key]) => !order[key])
    .map(([, label]) => label);
}

function formatTelegramMessage(order) {
  const createdAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date());

  return [
    "<b>ORDER TOP UP ROBUX - KUSU 5 DAY</b>",
    "",
    `Waktu: ${escapeHtml(createdAt)} WIB`,
    `Nama: ${escapeHtml(order.buyerName)}`,
    `Email: ${escapeHtml(order.email)}`,
    `Username Roblox: ${escapeHtml(order.robloxUsername)}`,
    `Paket: ${escapeHtml(order.packageName)}`,
    `Pembayaran: ${escapeHtml(order.paymentMethod)}`,
    `Catatan: ${escapeHtml(order.note)}`
  ].join("\n");
}

function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(path.join(PUBLIC_DIR, "index.html")));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 20_000) {
        req.destroy();
        reject(new Error("Payload terlalu besar."));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function clean(value) {
  return String(value || "").trim().slice(0, 500);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
