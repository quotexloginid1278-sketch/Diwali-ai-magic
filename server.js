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
    coverImage: "/uploads/default-cover.png",
    gallery: [
      { id: "1", type: "cover", url: "/uploads/default-cover.png", caption: "Main Ebook Cover" },
      { id: "2", type: "sample", url: "/uploads/sample-1.png", caption: "Royal Diwali Portrait" }
    ]
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

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diwali AI Magic</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-black text-white min-h-screen flex flex-col items-center justify-center p-6">
    <div class="bg-neutral-900 border border-amber-500/30 p-8 rounded-3xl max-w-lg text-center shadow-2xl">
        <h1 class="text-3xl font-bold text-amber-400 mb-4 font-serif">DIWALI AI MAGIC</h1>
        <p class="text-gray-300 mb-6">Website is successfully live and running! You can now configure your products and start selling.</p>
        <a href="/admin" class="bg-amber-500 text-black font-bold px-6 py-3 rounded-xl inline-block">Go to Admin / Store</a>
    </div>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
