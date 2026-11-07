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
    qrCodeImage: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=9876543210@paytm&pn=DiwaliAIMagic&am=49&cu=INR",
    whatsappNumber: "919876543210",
    supportEmail: "support@diwaliaimagic.com",
    offerDeadline: "2026-11-12T23:59:59",
    offerEnabled: true,
    pdfFilename: "diwali-ai-prompts-2026.pdf",
    coverImage: "https://images.unsplash.com/photo-1605722168404-974f2791d293?w=600&auto=format&fit=crop&q=80",
    gallery: [
      { id: "1", type: "cover", url: "https://images.unsplash.com/photo-1605722168404-974f2791d293?w=600&auto=format&fit=crop&q=80", caption: "Main Ebook Cover" },
      { id: "2", type: "sample", url: "https://images.unsplash.com/photo-1514251212353-4876b553e1a6?w=600&auto=format&fit=crop&q=80", caption: "Royal Diwali Portrait" },
      { id: "3", type: "sample", url: "https://images.unsplash.com/photo-1549488344-cbb6c34cf08b?w=600&auto=format&fit=crop&q=80", caption: "Luxury Cinematic Look" },
      { id: "4", type: "sample", url: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=600&auto=format&fit=crop&q=80", caption: "Trending Instagram Look" }
    ]
  },
  admin: {
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10)
  },
  orders: [],
  reviews: [
    { id: "rev_1", name: "Aakash Sharma", rating: 5, comment: "Amazing prompts! Got stunning royal Diwali photos instantly.", date: "2026-10-25", approved: true },
    { id: "rev_2", name: "Priya Verma", rating: 5, comment: "The couple and women portraits look super realistic.", date: "2026-10-28", approved: true }
  ]
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
    orderId, fullName, whatsappNumber: whatsappNumber.startsWith('+') ? whatsappNumber : '+91' + whatsappNumber, email: email || '',
    amount: db.settings.price, orderDate: new Date().toISOString(),
    paymentStatus: 'AWAITING PAYMENT', deliveryStatus: 'PENDING', screenshotPath: null, rejectionReason: ''
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

app.post('/api/orders/:orderId/upload-proof', upload.single('screenshot'), (req, res) => {
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (req.file) order.screenshotPath = '/uploads/' + req.file.filename;
  order.paymentStatus = 'PROOF SUBMITTED';
  saveDB(db);
  res.json({ success: true });
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

app.post('/api/admin/orders/:orderId/verify', (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (order) { order.paymentStatus = 'VERIFIED'; saveDB(db); }
  res.json({ success: true });
});

app.post('/api/admin/orders/:orderId/deliver', (req, res) => {
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Unauthorized' });
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (order) { order.deliveryStatus = 'DELIVERED'; saveDB(db); }
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diwali AI Magic - 2026 Special Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              luxury: { black: '#0a0a0a', dark: '#121212', card: '#1a1a1a', maroon: '#58111A', gold: '#D4AF37', goldLight: '#F3E5AB' }
            },
            fontFamily: { cinzel: ['Cinzel', 'serif'], sans: ['Plus Jakarta Sans', 'sans-serif'] }
          }
        }
      }
    </script>
    <style>
      body { background-color: #0a0a0a; color: #f3f4f6; font-family: 'Plus Jakarta Sans', sans-serif; }
      .gold-gradient { background: linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA8C2C 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .gold-bg { background: linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA8C2C 100%); }
      .glass-card { background: rgba(26, 26, 26, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(212, 175, 55, 0.2); }
      .no-scrollbar::-webkit-scrollbar { display: none; }
    </style>
</head>
<body class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-50 glass-card border-b border-luxury-gold/20 py-4 px-6 flex justify-between items-center">
        <div class="flex items-center space-x-3 cursor-pointer" onclick="switchView('home')">
            <div class="w-10 h-10 rounded-full gold-bg flex items-center justify-center text-black font-cinzel font-bold text-xl">🪔</div>
            <div>
                <span class="font-cinzel font-bold text-lg tracking-wider gold-gradient">DIWALI AI MAGIC</span>
                <span class="block text-[9px] tracking-widest text-luxury-goldLight uppercase">2026 Special Edition</span>
            </div>
        </div>
        <div class="flex items-center space-x-3">
            <button onclick="openAdminModal()" class="text-xs bg-luxury-card text-luxury-gold border border-luxury-gold/30 px-3 py-1.5 rounded-lg">Admin</button>
        </div>
    </header>

    <main id="app" class="flex-grow"></main>

    <footer class="bg-luxury-dark border-t border-luxury-gold/20 py-8 px-6 text-center text-xs text-gray-500">
        &copy; 2026 DIWALI AI MAGIC. All rights reserved.
    </footer>

    <script>
        let storeData = null;
        let currentOrderId = null;

        async function init() {
            const res = await fetch('/api/store/data');
            storeData = await res.json();
            renderHome();
        }

        function switchView(view, param) {
            window.scrollTo(0, 0);
            if(view === 'home') renderHome();
            else if(view === 'checkout') renderCheckout();
            else if(view === 'payment') renderPayment(param);
            else if(view === 'success') renderSuccess(param);
            else if(view === 'admin') renderAdmin();
        }

        function renderHome() {
            if(!storeData) return;
            const s = storeData.settings;
            let galleryHtml = s.gallery.map(img => \`
                <div class="flex-shrink-0 w-[300px] h-[380px] rounded-2xl overflow-hidden glass-card p-2 relative">
                    <img src="\${img.url}" class="w-full h-full object-cover rounded-xl">
                    <div class="absolute bottom-4 left-4 right-4 bg-black/70 px-3 py-1.5 rounded-xl text-xs text-luxury-goldLight">\${img.caption}</div>
                </div>
            \`).join('');

            document.getElementById('app').innerHTML = \`
                <section class="py-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div class="lg:col-span-7 space-y-6 text-center lg:text-left">
                        <span class="bg-luxury-maroon/60 border border-luxury-gold/30 px-4 py-1.5 rounded-full text-xs text-luxury-goldLight uppercase">Diwali 2026 Special Edition</span>
                        <h1 class="font-cinzel text-4xl sm:text-5xl font-bold text-white leading-tight">Make Your Diwali Photos Look <span class="gold-gradient">Royal!</span></h1>
                        <p class="text-gray-300 text-sm sm:text-base">\${s.productSubtitle}</p>
                        <div class="flex items-center justify-center lg:justify-start gap-4">
                            <button onclick="switchView('checkout')" class="gold-bg text-black font-cinzel font-bold px-8 py-4 rounded-xl shadow-xl text-base">BUY NOW - ₹\${s.price}</button>
                        </div>
                    </div>
                    <div class="lg:col-span-5 flex justify-center">
                        <div class="w-full max-w-sm rounded-3xl p-3 glass-card border border-luxury-gold/40 shadow-2xl">
                            <img src="\${s.coverImage}" class="w-full h-[380px] object-cover rounded-2xl">
                        </div>
                    </div>
                </section>
                <section class="py-10 px-6 max-w-7xl mx-auto">
                    <h2 class="font-cinzel text-2xl font-bold text-white mb-6 text-center">Preview Gallery</h2>
                    <div class="flex gap-4 overflow-x-auto no-scrollbar pb-4">\${galleryHtml}</div>
                </section>
            \`;
        }

        function renderCheckout() {
            document.getElementById('app').innerHTML = \`
                <div class="max-w-md mx-auto py-12 px-6">
                    <button onclick="switchView('home')" class="text-luxury-gold text-xs mb-4">← Back</button>
                    <div class="glass-card p-8 rounded-3xl border border-luxury-gold/30">
                        <h2 class="font-cinzel text-xl font-bold text-white mb-6">Complete Checkout</h2>
                        <form onsubmit="handleCheckout(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs text-luxury-goldLight mb-1">Full Name *</label>
                                <input type="text" id="fullName" required class="w-full bg-black border border-luxury-gold/30 rounded-xl px-4 py-3 text-sm text-white">
                            </div>
                            <div>
                                <label class="block text-xs text-luxury-goldLight mb-1">WhatsApp Number *</label>
                                <input type="tel" id="whatsapp" required placeholder="9876543210" class="w-full bg-black border border-luxury-gold/30 rounded-xl px-4 py-3 text-sm text-white">
                            </div>
                            <button type="submit" class="w-full gold-bg text-black font-cinzel font-bold py-3.5 rounded-xl text-sm mt-4">Proceed to Pay →</button>
                        </form>
                    </div>
                </div>
            \`;
        }

        async function handleCheckout(e) {
            e.preventDefault();
            const res = await fetch('/api/orders/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName: document.getElementById('fullName').value, whatsappNumber: document.getElementById('whatsapp').value })
            });
            const data = await res.json();
            if(data.success) switchView('payment', data.orderId);
        }

        async function renderPayment(orderId) {
            const res = await fetch('/api/orders/' + orderId);
            const data = await res.json();
            const s = data.settings;
            document.getElementById('app').innerHTML = \`
                <div class="max-w-md mx-auto py-12 px-6 text-center">
                    <div class="glass-card p-8 rounded-3xl border border-luxury-gold/30">
                        <h2 class="font-cinzel text-xl font-bold text-white mb-2">Scan & Pay ₹49</h2>
                        <p class="text-xs text-gray-400 mb-6">Order ID: \${orderId}</p>
                        <div class="bg-white p-3 rounded-2xl inline-block mb-6">
                            <img src="\${s.qrCodeImage}" class="w-48 h-48 mx-auto">
                        </div>
                        <p class="text-xs text-luxury-gold mb-6 font-mono">UPI ID: \${s.upiId}</p>
                        <button onclick="openUpload('\${orderId}')" class="w-full gold-bg text-black font-cinzel font-bold py-3.5 rounded-xl text-sm">I HAVE PAID - Upload Proof</button>
                    </div>
                </div>
            \`;
        }

        function openUpload(orderId) {
            const m = document.createElement('div');
            m.id = 'upModal';
            m.className = 'fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50';
            m.innerHTML = \`
                <div class="glass-card p-6 rounded-3xl max-w-sm w-full border border-luxury-gold/30 text-center">
                    <h3 class="font-cinzel font-bold text-white mb-4">Upload Screenshot</h3>
                    <input type="file" id="proofFile" accept="image/*" class="mb-4 text-xs text-gray-300">
                    <button onclick="submitProof('\${orderId}')" class="w-full gold-bg text-black font-bold py-2.5 rounded-xl text-xs">Submit Proof</button>
                </div>
            \`;
            document.body.appendChild(m);
        }

        async function submitProof(orderId) {
            const file = document.getElementById('proofFile').files[0];
            if(!file) { alert('Select file'); return; }
            const fd = new FormData();
            fd.append('screenshot', file);
            await fetch('/api/orders/' + orderId + '/upload-proof', { method: 'POST', body: fd });
            document.getElementById('upModal').remove();
            switchView('success', orderId);
        }

        function renderSuccess(orderId) {
            document.getElementById('app').innerHTML = \`
                <div class="max-w-md mx-auto py-16 px-6 text-center">
                    <div class="glass-card p-8 rounded-3xl border border-luxury-gold/30">
                        <div class="text-emerald-400 text-4xl mb-4">✓</div>
                        <h2 class="font-cinzel text-xl font-bold text-white mb-2">Payment Proof Submitted!</h2>
                        <p class="text-xs text-gray-300 mb-6">We will verify your payment and deliver the PDF to your WhatsApp within 1 hour.</p>
                        <button onclick="switchView('home')" class="bg-luxury-card text-luxury-gold border border-luxury-gold/30 px-6 py-2.5 rounded-xl text-xs">Back to Home</button>
                    </div>
                </div>
            \`;
        }

        function openAdminModal() {
            const m = document.createElement('div');
            m.id = 'admModal';
            m.className = 'fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50';
            m.innerHTML = \`
                <div class="glass-card p-6 rounded-3xl max-w-sm w-full border border-luxury-gold/30">
                    <h3 class="font-cinzel font-bold text-white mb-4">Admin Login</h3>
                    <input type="text" id="aUser" value="admin" class="w-full bg-black border border-luxury-gold/30 rounded-xl px-4 py-2.5 text-sm mb-3 text-white">
                    <input type="password" id="aPass" value="admin123" class="w-full bg-black border border-luxury-gold/30 rounded-xl px-4 py-2.5 text-sm mb-4 text-white">
                    <button onclick="adminLogin()" class="w-full gold-bg text-black font-bold py-2.5 rounded-xl text-xs">Login</button>
                </div>
            \`;
            document.body.appendChild(m);
        }

        async function adminLogin() {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: document.getElementById('aUser').value, password: document.getElementById('aPass').value })
            });
            const data = await res.json();
            if(data.success) {
                document.getElementById('admModal').remove();
                switchView('admin');
            } else { alert('Invalid Login'); }
        }

        async function renderAdmin() {
            const res = await fetch('/api/admin/dashboard');
            if(!res.status === 200) { switchView('home'); return; }
            const data = await res.json();
            let rows = data.orders.map(o => \`
                <tr class="border-b border-gray-800 text-xs">
                    <td class="py-3 px-2 text-luxury-gold">\${o.orderId}</td>
                    <td class="py-3 px-2">\${o.fullName}</td>
                    <td class="py-3 px-2">\${o.whatsappNumber}</td>
                    <td class="py-3 px-2">\${o.paymentStatus}</td>
                    <td class="py-3 px-2"><button onclick="verifyOrder('\${o.orderId}')" class="bg-emerald-600 px-2 py-1 rounded text-white">Verify</button> <button onclick="deliverOrder('\${o.orderId}')" class="bg-amber-600 px-2 py-1 rounded text-white">Deliver</button></td>
                </tr>
            \`).join('');

            document.getElementById('app').innerHTML = \`
                <div class="max-w-6xl mx-auto py-10 px-6">
                    <div class="flex justify-between items-center mb-6">
                        <h1 class="font-cinzel text-2xl font-bold text-white">Admin Dashboard</h1>
                        <button onclick="switchView('home')" class="bg-luxury-card text-luxury-gold border border-luxury-gold/30 px-4 py-2 rounded-xl text-xs">Logout</button>
                    </div>
                    <div class="glass-card p-6 rounded-3xl border border-lux
