/**
 * DIWALI AI MAGIC - Complete Full-Stack Digital Product Store & Admin System
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- STORAGE & DATABASE SETUP ---
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
      { id: "2", type: "sample", url: "/uploads/sample-1.png", caption: "Royal Diwali Portrait" },
      { id: "3", type: "sample", url: "/uploads/sample-2.png", caption: "Luxury Cinematic Look" },
      { id: "4", type: "sample", url: "/uploads/sample-3.png", caption: "Trending Instagram Look" }
    ]
  },
  admin: {
    username: "admin",
    passwordHash: bcrypt.hashSync("admin123", 10)
  },
  orders: [],
  reviews: [
    { id: "rev_1", name: "Aakash Sharma", rating: 5, comment: "Amazing prompts! Got stunning royal Diwali photos on Midjourney instantly.", date: "2026-10-25", approved: true },
    { id: "rev_2", name: "Priya Verma", rating: 5, comment: "The couple and women portraits look super realistic and high quality.", date: "2026-10-28", approved: true }
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

// --- MIDDLEWARE ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'diwali-ai-magic-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'));
    }
  }
});

// --- API ROUTES ---
app.get('/api/store/data', (req, res) => {
  const db = loadDB();
  const approvedReviews = db.reviews.filter(r => r.approved);
  res.json({
    settings: db.settings,
    reviews: approvedReviews
  });
});

app.post('/api/orders/create', (req, res) => {
  const { fullName, whatsappNumber, email } = req.body;
  if (!fullName || !whatsappNumber) {
    return res.status(400).json({ error: 'Full name and WhatsApp number are required.' });
  }

  const db = loadDB();
  const orderId = 'DAM-' + Math.floor(100000 + Math.random() * 900000);
  
  const newOrder = {
    orderId,
    fullName,
    whatsappNumber: whatsappNumber.startsWith('+') ? whatsappNumber : '+91' + whatsappNumber.replace(/\D/g, ''),
    email: email || '',
    product: db.settings.productName,
    amount: db.settings.price,
    orderDate: new Date().toISOString(),
    screenshotPath: null,
    screenshotTime: null,
    paymentStatus: 'AWAITING PAYMENT',
    deliveryStatus: 'PENDING',
    utrNumber: '',
    rejectionReason: '',
    deliveryDate: '',
    deliveryNotes: ''
  };

  db.orders.push(newOrder);
  saveDB(db);

  res.json({ success: true, orderId });
});

app.get('/api/orders/:orderId', (req, res) => {
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order, settings: db.settings });
});

app.post('/api/orders/:orderId/upload-proof', upload.single('screenshot'), (req, res) => {
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (!req.file) return res.status(400).json({ error: 'Screenshot file is required.' });

  order.screenshotPath = '/uploads/' + req.file.filename;
  order.screenshotTime = new Date().toISOString();
  order.paymentStatus = 'PROOF SUBMITTED';
  order.rejectionReason = '';

  saveDB(db);
  res.json({ success: true, message: 'Payment proof submitted successfully.' });
});

app.post('/api/reviews/submit', (req, res) => {
  const { name, rating, comment } = req.body;
  if (!name || !rating || !comment) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const db = loadDB();
  const newReview = {
    id: 'rev_' + Date.now(),
    name,
    rating: parseInt(rating),
    comment,
    date: new Date().toISOString().split('T')[0],
    approved: false
  };

  db.reviews.push(newReview);
  saveDB(db);

  res.json({ success: true, message: 'Review submitted for admin approval.' });
});

// --- ADMIN AUTH & API ---
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();

  if (username === db.admin.username && bcrypt.compareSync(password, db.admin.passwordHash)) {
    req.session.isAdmin = true;
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid username or password.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized access.' });
  }
}

app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const db = loadDB();
  const orders = db.orders;
  
  const stats = {
    totalOrders: orders.length,
    awaitingPayment: orders.filter(o => o.paymentStatus === 'AWAITING PAYMENT').length,
    proofSubmitted: orders.filter(o => o.paymentStatus === 'PROOF SUBMITTED').length,
    verifiedPayments: orders.filter(o => o.paymentStatus === 'VERIFIED').length,
    rejectedPayments: orders.filter(o => o.paymentStatus === 'REJECTED').length,
    deliveredOrders: orders.filter(o => o.deliveryStatus === 'DELIVERED').length,
    totalRevenue: orders.filter(o => o.paymentStatus === 'VERIFIED').reduce((sum, o) => sum + o.amount, 0)
  };

  res.json({ stats, orders: [...orders].reverse(), settings: db.settings, reviews: db.reviews });
});

app.post('/api/admin/orders/:orderId/verify', requireAdmin, (req, res) => {
  const { utrNumber } = req.body;
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.paymentStatus = 'VERIFIED';
  order.utrNumber = utrNumber || 'MANUAL-VERIFIED';
  order.verificationTime = new Date().toISOString();

  saveDB(db);
  res.json({ success: true, message: 'Payment verified successfully.' });
});

app.post('/api/admin/orders/:orderId/reject', requireAdmin, (req, res) => {
  const { reason } = req.body;
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.paymentStatus = 'REJECTED';
  order.rejectionReason = reason || 'Screenshot unclear or payment not received.';

  saveDB(db);
  res.json({ success: true, message: 'Payment rejected.' });
});

app.post('/api/admin/orders/:orderId/deliver', requireAdmin, (req, res) => {
  const { notes } = req.body;
  const db = loadDB();
  const order = db.orders.find(o => o.orderId === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  order.deliveryStatus = 'DELIVERED';
  order.deliveryDate = new Date().toISOString();
  order.deliveryNotes = notes || 'Delivered via WhatsApp.';

  saveDB(db);
  res.json({ success: true, message: 'Order marked as delivered.' });
});

app.post('/api/admin/settings', requireAdmin, upload.fields([
  { name: 'qrCode', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]), (req, res) => {
  const db = loadDB();
  const body = req.body;

  if (body.upiId) db.settings.upiId = body.upiId;
  if (body.payeeName) db.settings.payeeName = body.payeeName;
  if (body.whatsappNumber) db.settings.whatsappNumber = body.whatsappNumber;
  if (body.supportEmail) db.settings.supportEmail = body.supportEmail;
  if (body.price) db.settings.price = parseFloat(body.price);
  if (body.offerDeadline) db.settings.offerDeadline = body.offerDeadline;
  if (body.offerEnabled !== undefined) db.settings.offerEnabled = body.offerEnabled === 'true';

  if (req.files) {
    if (req.files['qrCode']) {
      db.settings.qrCodeImage = '/uploads/' + req.files['qrCode'][0].filename;
    }
    if (req.files['coverImage']) {
      db.settings.coverImage = '/uploads/' + req.files['coverImage'][0].filename;
    }
    if (req.files['pdfFile']) {
      db.settings.pdfFilename = req.files['pdfFile'][0].filename;
    }
  }

  saveDB(db);
  res.json({ success: true, settings: db.settings });
});

// --- FRONTEND SINGLE PAGE APP ---
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
              luxury: {
                black: '#0a0a0a',
                dark: '#121212',
                card: '#1a1a1a',
                maroon: '#58111A',
                deepMaroon: '#3A0A10',
                gold: '#D4AF37',
                goldLight: '#F3E5AB',
                goldDark: '#AA8C2C'
              }
            },
            fontFamily: {
              cinzel: ['Cinzel', 'serif'],
              sans: ['Plus Jakarta Sans', 'sans-serif']
            }
          }
        }
      }
    </script>
    <style>
      body { background-color: #0a0a0a; color: #f3f4f6; font-family: 'Plus Jakarta Sans', sans-serif; }
      .font-cinzel { font-family: 'Cinzel', serif; }
      .gold-gradient { background: linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA8C2C 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .gold-bg { background: linear-gradient(135deg, #F3E5AB 0%, #D4AF37 50%, #AA8C2C 100%); }
      .gold-border { border-color: #D4AF37; }
      .glass-card { background: rgba(26, 26, 26, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(212, 175, 55, 0.2); }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="min-h-screen flex flex-col antialiased selection:bg-luxury-gold selection:text-black">

    <header class="sticky top-0 z-50 glass-card border-b border-luxury-gold/20 py-4 px-6">
        <div class="max-w-7xl mx-auto flex justify-between items-center">
            <div class="flex items-center space-x-3 cursor-pointer" onclick="switchView('home')">
                <div class="w-10 h-10 rounded-full gold-bg flex items-center justify-center text-luxury-black font-cinzel font-bold text-xl shadow-lg">🪔</div>
                <div>
                    <span class="font-cinzel font-bold text-xl tracking-wider gold-gradient">DIWALI AI MAGIC</span>
                    <span class="block text-[10px] tracking-widest text-luxury-goldLight uppercase">2026 Special Edition</span>
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <button onclick="openTrackModal()" class="text-sm font-medium text-luxury-goldLight hover:text-luxury-gold transition flex items-center gap-1.5">
                    <i class="fa-solid fa-receipt"></i> Track Order
                </button>
                <button onclick="openAdminLogin()" class="text-xs bg-luxury-card hover:bg-luxury-maroon text-luxury-gold border border-luxury-gold/30 px-3 py-1.5 rounded-lg transition">
                    <i class="fa-solid fa-lock mr-1"></i> Admin
                </button>
            </div>
        </div>
    </header>

    <main id="app" class="flex-grow"></main>

    <footer class="bg-luxury-dark border-t border-luxury-gold/20 py-12 px-6 mt-20">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
                <h3 class="font-cinzel text-lg font-bold gold-gradient mb-4">DIWALI AI MAGIC</h3>
                <p class="text-sm text-gray-400">The ultimate collection of 50+ premium AI photo prompts designed to make your Diwali 2026 portraits look royal and breathtaking.</p>
            </div>
            <div>
                <h4 class="font-cinzel text-sm font-semibold text-luxury-gold uppercase tracking-wider mb-4">Quick Links</h4>
                <ul class="space-y-2 text-sm text-gray-400">
                    <li><a href="#categories" class="hover:text-luxury-gold">Prompt Categories</a></li>
                    <li><a href="#howitworks" class="hover:text-luxury-gold">How It Works</a></li>
                    <li><a href="#faq" class="hover:text-luxury-gold">FAQ</a></li>
                    <li><a href="javascript:void(0)" onclick="openModal('privacyModal')" class="hover:text-luxury-gold">Privacy Policy</a></li>
                </ul>
            </div>
            <div>
                <h4 class="font-cinzel text-sm font-semibold text-luxury-gold uppercase tracking-wider mb-4">Policies</h4>
                <ul class="space-y-2 text-sm text-gray-400">
                    <li><a href="javascript:void(0)" onclick="openModal('termsModal')" class="hover:text-luxury-gold">Terms & Conditions</a></li>
                    <li><a href="javascript:void(0)" onclick="openModal('refundModal')" class="hover:text-luxury-gold">Refund Policy</a></li>
                </ul>
            </div>
            <div>
                <h4 class="font-cinzel text-sm font-semibold text-luxury-gold uppercase tracking-wider mb-4">Customer Support</h4>
                <p class="text-sm text-gray-400 mb-3">Get instant delivery & support on WhatsApp.</p>
                <a id="footerWhatsappBtn" href="https://wa.me/919876543210" target="_blank" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-lg">
                    <i class="fa-brands fa-whatsapp text-lg"></i> Chat on WhatsApp
                </a>
            </div>
        </div>
        <div class="max-w-7xl mx-auto pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
            &copy; 2026 DIWALI AI MAGIC. All rights reserved.
        </div>
    </footer>

    <script>
        let storeData = null;
        let currentOrderId = null;

        async function initApp() {
            try {
                const res = await fetch('/api/store/data');
                storeData = await res.json();
                renderHome();
                document.getElementById('footerWhatsappBtn').href = 'https://wa.me/' + storeData.settings.whatsappNumber;
                startCountdown(storeData.settings.offerDeadline);
            } catch (e) {
                console.error("Failed to load store data", e);
            }
        }

        function switchView(view, param) {
            window.scrollTo(0, 0);
            if (view === 'home') renderHome();
            else if (view === 'checkout') renderCheckout();
            else if (view === 'payment') renderPayment(param);
            else if (view === 'success') renderSuccess(param);
            else if (view === 'admin') renderAdmin();
        }

        function renderHome() {
            if (!storeData) return;
            const s = storeData.settings;
            const reviews = storeData.reviews;

            let galleryHtml = s.gallery.map((img, idx) => \`
                <div class="flex-shrink-0 w-full sm:w-[450px] h-[350px] sm:h-[420px] rounded-2xl overflow-hidden glass-card p-2 relative cursor-pointer group" onclick="openLightbox('\${img.url}', '\${img.caption}')">
                    <img src="\${img.url}" alt="\${img.caption}" class="w-full h-full object-cover rounded-xl group-hover:scale-105 transition duration-500">
                    <div class="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold text-luxury-goldLight border border-luxury-gold/20">
                        \${img.caption} \${idx === 0 ? '<span class="float-right bg-luxury-gold text-black px-2 py-0.5 rounded text-[10px] font-bold">EBOOK COVER</span>' : ''}
                    </div>
                </div>
            \`).join('');

            let reviewsHtml = reviews.length > 0 ? reviews.map(r => \`
                <div class="glass-card p-6 rounded-2xl border border-luxury-gold/20 flex flex-col justify-between">
                    <div>
                        <div class="flex text-amber-400 mb-3 text-sm">
                            \${'<i class="fa-solid fa-star"></i>'.repeat(r.rating)}
                        </div>
                        <p class="text-gray-300 text-sm mb-4">"\${r.comment}"</p>
                    </div>
                    <div class="flex justify-between items-center text-xs text-luxury-goldLight border-t border-gray-800 pt-3">
                        <span class="font-semibold text-white">\${r.name}</span>
                        <span>Verified Customer</span>
                    </div>
                </div>
            \`).join('') : '<p class="text-gray-500 text-center col-span-full py-8">No customer reviews published yet.</p>';

            document.getElementById('app').innerHTML = \`
                <section class="relative py-16 sm:py-24 px-6 overflow-hidden bg-gradient-to-b from-luxury-dark via-luxury-black to-luxury-dark">
                    <div class="absolute inset-0 opacity-10 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:24px_24px]"></div>
                    <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                        <div class="lg:col-span-7 space-y-6 text-center lg:text-left">
                            <div class="inline-flex items-center gap-2 bg-luxury-maroon/60 border border-luxury-gold/30 px-4 py-1.5 rounded-full text-xs font-semibold text-luxury-goldLight tracking-wider uppercase shadow-inner">
           
