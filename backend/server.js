// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- HELPER: loadRouter yang Lebih Aman ---
// Menggunakan path.join agar terbaca benar di Vercel (Linux)
function loadRouter(filename) {
  try {
    // Asumsi: folder routes ada di dalam 'src/routes' relatif terhadap server.js
    // path.join(__dirname, 'src', 'routes', filename)
    const fullPath = path.join(__dirname, 'src', 'routes', filename);
    
    const mod = require(fullPath);
    const router = (mod && mod.default) ? mod.default : mod;

    if (!router || (typeof router !== 'function' && typeof router.use !== 'function')) {
      console.error(`⚠️ Peringatan: ${filename} tidak mengekspor router valid.`);
      // Return router kosong agar tidak crash
      return express.Router();
    }
    return router;
  } catch (err) {
    console.error(`❌ ERROR FATAL: Gagal memuat route '${filename}'`);
    console.error(`   Pesan Error: ${err.message}`);
    // Jangan process.exit(1) agar kita bisa lihat errornya di Log Vercel
    return express.Router(); 
  }
}

// --- 1. SETUP CORS ---
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000',
  // Ganti dengan URL Frontend Vercel Anda yang sebenarnya nanti
  'https://lifemon-frontend-web.vercel.app', 
  'https://web-rpl-16.vercel.app' 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // Izinkan sementara untuk debugging
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// --- 2. STATIC FILES ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 3. IMPORT ROUTES ---
// Pastikan nama file di dalam tanda kutip SAMA PERSIS (huruf besar/kecil) 
// dengan nama file asli di folder src/routes Anda.
const userRoutes = loadRouter('userRoutes');
const foodLogRoutes = loadRouter('foodLogRoutes');
const sleepLogRoutes = loadRouter('sleepLogRoutes');
const exerciseLogRoutes = loadRouter('exerciseLogRoutes');
const reportRoutes = loadRouter('reportRoutes');
const adminRoutes = loadRouter('adminRoutes'); 
const chatRoutes = loadRouter('chatRoutes'); 
const journalRoutes = loadRouter('journalRoutes'); 

// --- 4. ROUTES MOUNTING ---
app.use('/api/users', userRoutes);
app.use('/api/food-logs', foodLogRoutes);
app.use('/api/sleep-logs', sleepLogRoutes);
app.use('/api/exercise-logs', exerciseLogRoutes);
app.use('/api/laporan', reportRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/chat', chatRoutes); 
app.use('/api/journals', journalRoutes);

// Route Default (Health Check)
app.get('/', (req, res) => {
  res.status(200).send('✅ API LifeMon Berjalan di Vercel (Mode Serverless)');
});

// --- 5. START SERVER ---
// Hanya jalankan listen jika di local (development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`🚀 Server LifeMon aktif di http://localhost:${PORT}`);
    });
}

// --- 6. EXPORT APP (WAJIB) ---
module.exports = app;