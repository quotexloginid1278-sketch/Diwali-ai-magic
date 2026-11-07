const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

const defaultDB = {
  settings: {
    productName: "Diwali AI Photo Prompts – 2026 Special Edition",
    price: 49,
    upiId: "9876543210@paytm",
    payeeName: "Diwali AI Magic",
    qrCodeImage: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=9876543210@paytm&pn=DiwaliAIMagic&am=49&cu=INR",
    whatsappNumber: "919876543210",
    coverImage: "https://images.unsplash.com/photo-1605722168404-974f2791d293?w=600&auto=format&fit=crop&q=80"
  },
  admin: { username: "admin", passwordHash: bcrypt.hashSync("admin123", 10) },
  orders: []
};

function loadDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveDB(d) { fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2)); }

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({ secret: 'diwali-secret-2026', resave: false, saveUninitialized: false }));
const upload = multer({ dest: path.join(__dirname, 'public', 'uploads') });

app.get('/api/store/data', (req, res) => {
  const db = loadDB();
  res.json({ settings: db.settings });
});

app.post('/api/orders/create', (req, res) => {
  const { fullName, whatsappNumber } = req.body;
  if (!fullName || !whatsappNumber) return res.status(400).json({ error: 'Required' });
  const db = loadDB();
  const orderId = 'DAM-' + Math.floor(100000 + Math.random() * 900000);
  db.orders.push({ orderId, fullName, whatsappNumber, amount: 49, paymentStatus: 'AWAITING PAYMENT', deliveryStatus: 'PENDING' });
  saveDB(db);
  res.json({ success: true, orderId });
});

app.get('/api/orders/:id', (req, res) => {
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.id);
  res.json({ order, settings: db.settings });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();
  if (username === db.admin.username && bcrypt.compareSync(password, db.admin.passwordHash)) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else { res.status(401).json({ error: 'Invalid' }); }
});

app.get('/api/admin/dashboard', (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  const db = loadDB();
  res.json({ orders: db.orders, settings: db.settings });
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diwali AI Magic</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;750&family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">
    <style>body { background: #0a0a0a; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="min-h-screen flex flex-col justify-between">
    <header class="p-4 border-b border-amber-500/20 flex justify-between items-center bg-neutral-900">
        <h1 class="font-serif font-bold text-amber-400 text-lg">🪔 DIWALI AI MAGIC</h1>
        <button onclick="openAdmin()" class="text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30">Admin</button>
    </header>
    <main id="app" class="flex-grow p-6 max-w-lg mx-auto w-full flex flex-col justify-center"></main>
    <footer class="p-4 text-center text-xs text-gray-500 border-t border-neutral-900">&copy; 2026 Diwali AI Magic</footer>
    <script>
        async function loadHome() {
            const res = await fetch('/api/store/data');
            const data = await res.json();
            const s = data.settings;
            document.getElementById('app',).innerHTML = \`
                <div class="bg-neutral-900 border border-amber-500/30 p-6 rounded-3xl text-center shadow-2xl">
                    <img src="\${s.coverImage}" class="w-full h-64 object-cover rounded-2xl mb-4 border border-amber-500/20">
                    <h2 class="text-2xl font-serif font-bold text-amber-400 mb-2">\${s.productName}</h2>
                    <p class="text-amber-200 text-sm mb-4 font-bold">Special Offer: ₹\${s.price} INR Only</p>
                    <button onclick="renderCheckout()" class="w-full bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-black font-bold py-3.5 rounded-xl shadow-lg">BUY NOW - ₹49</button>
                </div>
            \`;
        }
        function renderCheckout() {
            document.getElementById('app').innerHTML = \`
                <div class="bg-neutral-900 border border-amber-500/30 p-6 rounded-3xl shadow-2xl">
                    <h2 class="text-xl font-serif font-bold text-amber-400 mb-4">Complete Order</h2>
                    <form onsubmit="submitOrder(event)" class="space-y-4 text-left">
                        <div><label class="text-xs text-amber-200">Full Name *</label><input type="text" id="name" required class="w-full bg-black border border-amber-500/30 rounded-xl p-3 text-white mt-1"></div>
                        <div><label class="text-xs text-amber-200">WhatsApp Number *</label><input type="tel" id="whats" required placeholder="9876543210" class="w-full bg-black border border-amber-500/30 rounded-xl p-3 text-white mt-1"></div>
                        <button type="submit" class="w-full bg-amber-400 text-black font-bold py-3.5 rounded-xl mt-2">Proceed to UPI Pay →</button>
                    </form>
                </div>
            \`;
        }
        async function submitOrder(e) {
            e.preventDefault();
            const res = await fetch('/api/orders/create', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: document.getElementById('name').value, whatsappNumber: document.getElementById('whats').value })
            });
            const d = await res.json();
            if(d.success) renderPayment(d.orderId);
        }
        async function renderPayment(id) {
            const res = await fetch('/api/orders/' + id);
            const d = await res.json();
            document.getElementById('app').innerHTML = \`
                <div class="bg-neutral-900 border border-amber-500/30 p-6 rounded-3xl text-center shadow-2xl">
                    <h2 class="text-xl font-serif font-bold text-amber-400 mb-2">Scan & Pay ₹49</h2>
                    <p class="text-xs text-gray-400 mb-4">Order ID: \${id}</p>
                    <div class="bg-white p-3 rounded-2xl inline-block mb-4"><img src="\${d.settings.qrCodeImage}" class="w-48 h-48 mx-auto"></div>
                    <p class="text-xs text-amber-300 font-mono mb-4">UPI: \${d.settings.upiId}</p>
                    <button onclick="alert('Payment proof submitted! We will verify and deliver on WhatsApp.'); location.reload();" class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">I HAVE PAID</button>
                </div>
            \`;
        }
        function openAdmin() {
            const p = prompt('Enter Admin Password (admin123):');
            if(!p) return;
            fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: p }) })
            .then(r => r.json()).then(d => { if(d.success) renderAdmin(); else alert('Wrong Password'); });
        }
        async function renderAdmin() {
            const res = await fetch('/api/admin/dashboard');
            const d = await res.json();
            let rows = d.orders.map(o => \`<tr class="border-b border-neutral-800 text-xs"><td class="py-2">\${o.orderId}</td><td>\${o.fullName}</td><td>\${o.whatsappNumber}</td><td>\${o.paymentStatus}</td></tr>\`).join('');
            document.getElementById('app').innerHTML = \`
                <div class="bg-neutral-900 border border-amber-500/30 p-6 rounded-3xl shadow-2xl text-left">
                    <h2 class="text-xl font-serif font-bold text-amber-400 mb-4">Admin Dashboard</h2>
                    <table class="w-full"><thead><tr class="text-xs text-amber-200 border-b border-neutral-800"><th>ID</th><th>Name</th><th>WhatsApp</th><th>Status</th></tr></thead><tbody>\${rows || '<tr><td colspan="4" class="text-center py-4 text-gray-500">No orders</td></tr>'}</tbody></table>
                    <button onclick="loadHome()" class="mt-4 bg-neutral-800 text-xs px-4 py-2 rounded-lg text-amber-300">Logout / Home</button>
                </div>
            \`;
        }
        loadHome();
    </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Server running'));
