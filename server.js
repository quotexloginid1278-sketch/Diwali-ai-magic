const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'database.json');

const defaultDB = {
  settings: {
    brandName: "DIWALI AI MAGIC",
    productName: "Diwali AI Photo Prompts – 2026 Special Edition",
    productSubtitle: "50+ Premium AI Photo Prompts – 2026 Special Edition",
    price: 49,
    upiId: "9876543210@paytm",
    payeeName: "Diwali AI Magic",
    qrCodeImage: "/uploads/default-qr.png",
    whatsappNumber: "919876543210",
    supportEmail: "support@diwaliaimagic.com",
    offerDeadline: "2026-11-12T23:59:59",
    offerEnabled: true,
    pdfFilename: "diwali-ai-prompts-2026.pdf",
    coverImage: "/uploads/default-cover.png"
  },
  admin: {
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10)
  },
  orders: [],
  reviews: []
};

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return defaultDB;
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'diwali-secret-2026',
  resave: false,
  saveUninitialized: false
}));

const upload = multer({ dest: UPLOADS_DIR });

app.get('/api/store/data', (req, res) => {
  const db = loadDB();
  res.json({ settings: db.settings, reviews: db.reviews.filter(r => r.approved) });
});

app.post('/api/orders/create', (req, res) => {
  const { fullName, whatsappNumber, email } = req.body;
  if (!fullName || !whatsappNumber) return res.status(400).json({ error: 'Required fields missing' });
  const db = loadDB();
  const orderId = 'DAM-' + Math.floor(100000 + Math.random() * 900000);
  db.orders.push({
    orderId, fullName, whatsappNumber, email: email || '',
    amount: db.settings.price, orderDate: new Date().toISOString(),
    paymentStatus: 'AWAITING PAYMENT', deliveryStatus: 'PENDING'
  });
  saveDB(db);
  res.json({ success: true, orderId });
});

app.get('/api/orders/:orderId', (req, res) => {
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json({ order, settings: db.settings });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();
  if (username === db.admin.username && bcrypt.compareSync(password, db.admin.passwordHash)) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/admin/dashboard', (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  const db = loadDB();
  res.json({ stats: { totalOrders: db.orders.length }, orders: db.orders, settings: db.settings });
});

app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Diwali AI Magic</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white min-h-screen p-6">
    <div class="max-w-xl mx-auto bg-neutral-900 border border-amber-500/30 p-8 rounded-3xl shadow-2xl mt-10">
        <h1 class="text-2xl font-bold text-amber-400 mb-6 font-serif text-center">Admin Dashboard Login</h1>
        <form onsubmit="login(event)" class="space-y-4">
            <div>
                <label class="block text-xs text-amber-200 mb-1 font-semibold">Username</label>
                <input type="text" id="user" value="admin" class="w-full bg-black border border-amber-500/30 rounded-xl px-4 py-3 text-white">
            </div>
            <div>
                <label class="block text-xs text-amber-200 mb-1 font-semibold">Password</label>
                <input type="password" id="pass" value="admin123" class="w-full bg-black border border-amber-500/30 rounded-xl px-4 py-3 text-white">
            </div>
            <button type="submit" class="w-full bg-amber-500 text-black font-bold py-3.5 rounded-xl shadow-lg">Login</button>
        </form>
        <div id="msg" class="mt-4 text-center text-sm text-red-400"></div>
    </div>
    <script>
        async function login(e) {
            e.preventDefault();
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: document.getElementById('user').value, password: document.getElementById('pass').value })
            });
            const data = await res.json();
            if(data.success) {
                alert('Login Successful!');
                window.location.href = '/';
            } else {
                document.getElementById('msg').innerText = 'Invalid Login Credentials';
            }
        }
    </script>
</body>
</html>`);
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diwali AI Magic - 2026 Special Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <div class="bg-neutral-900 border border-amber-500/30 p-8 rounded-3xl max-w-lg shadow-2xl">
        <h1 class="text-3xl font-bold text-amber-400 mb-3 font-serif">DIWALI AI MAGIC</h1>
        <p class="text-amber-200 text-sm mb-2 font-semibold">Diwali AI Photo Prompts – 2026 Special Edition</p>
        <p class="text-gray-400 text-xs mb-6">Price: ₹49 INR | Get 50+ Royal AI Photo Prompts</p>
        <div class="space-y-3">
            <a href="/admin" class="block w-full bg-amber-500 text-black font-bold py-3.5 rounded-xl shadow-lg text-sm">Go to Admin Login</a>
        </div>
    </div>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
