const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const packages = document.querySelectorAll(".package");
const payment = document.querySelector("#payment");
const username = document.querySelector("#username");
const phone = document.querySelector("#phone");
const summaryPackage = document.querySelector("#summaryPackage");
const summaryAmount = document.querySelector("#summaryAmount");
const summaryPrice = document.querySelector("#summaryPrice");
const summaryPayment = document.querySelector("#summaryPayment");
const toast = document.querySelector("#toast");
const orderForm = document.querySelector("#orderForm");
const submitButton = orderForm.querySelector("button[type='submit']");
let selectedPackage = packages[0].dataset;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function updateSummary(data) {
  selectedPackage = data;
  summaryPackage.textContent = data.name;
  summaryAmount.textContent = data.amount;
  summaryPrice.textContent = formatter.format(Number(data.price));
  summaryPayment.textContent = payment.value;
}

packages.forEach((item) => {
  item.addEventListener("click", () => {
    packages.forEach((pkg) => pkg.classList.remove("active"));
    item.classList.add("active");
    updateSummary(item.dataset);
    document.querySelector("#order").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function buildOrderText() {
  return [
    "Order Koko Robux - Promo 5 Hari",
    "Status: Proses manual",
    `Username: ${username.value || "-"}`,
    `Kontak: ${phone.value || "-"}`,
    `Paket: ${selectedPackage.name}`,
    `Jumlah: ${selectedPackage.amount}`,
    `Pembayaran: ${payment.value}`,
    `Total: ${formatter.format(Number(selectedPackage.price))}`
  ].join("\n");
}

async function submitOrder() {
  const payload = {
    robloxUsername: username.value.trim(),
    whatsapp: phone.value.trim(),
    packageName: selectedPackage.name,
    amount: selectedPackage.amount,
    price: formatter.format(Number(selectedPackage.price)),
    paymentMethod: payment.value,
    note: buildOrderText()
  };

  const response = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Pesanan gagal dikirim.");
  }

  return result.message;
}

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!username.value.trim() || !phone.value.trim()) {
    showToast("Lengkapi username dan kontak dulu.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Mengirim...";

  try {
    const message = await submitOrder();
    showToast(message || "Pesanan terkirim ke Telegram admin.");
    event.target.reset();
    summaryPayment.textContent = payment.value;
  } catch (error) {
    showToast(error.message || "Gagal kirim ke Telegram. Cek token bot, chat id, dan koneksi internet.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Kirim Pesanan ke Telegram";
  }
});

document.querySelector("#copyOrder").addEventListener("click", async () => {
  const text = buildOrderText();
  try {
    await navigator.clipboard.writeText(text);
    showToast("Format order berhasil disalin.");
  } catch {
    showToast(text);
  }
});
