// backend/controllers/userProfileController.js
const UserModel = require('../models/userModel');
const UserProfileModel = require('../models/userProfileModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Modul wajib untuk cek folder

// --- KONFIGURASI MULTER (DENGAN AUTO-CREATE FOLDER) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars/';
    
    // Cek apakah folder sudah ada. Jika belum, buat folder tersebut.
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Folder berhasil dibuat: ${dir}`);
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Nama file unik agar tidak bentrok
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

// Inisialisasi upload
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Batas 5MB
  fileFilter: fileFilter
});

// --- CONTROLLER FUNCTIONS ---

// 1. Ambil Profil
const getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID tidak ditemukan' });

        const profile = await UserProfileModel.getProfileByUserId(userId);
        
        if (!profile) {
            const user = await UserModel.findUserById(userId);
            // Return data user dasar jika profil belum ada
            return res.json({ 
                success: true, 
                data: { 
                    id: user.id,
                    nama: user.nama,
                    email: user.email,
                    npm: user.npm,
                    jurusan: user.jurusan,
                    role: user.role || 'user',
                    avatar_url: null 
                } 
            });
        }

        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Update Profil
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID tidak ditemukan' });

        const { 
            nama, npm, jurusan, email, 
            phone, alamat, bio, avatar_url,
            tanggal_lahir, jenis_kelamin, tinggi_badan, berat_badan 
        } = req.body;

        console.log('📝 Incoming update data:', req.body);

        const db = require('../config/db');
        
        // Prepare data - handle nulls, undefined, and type conversions
        const prepare = {
            nama: (nama !== null && nama !== undefined && String(nama).trim()) ? String(nama).trim() : '',
            npm: (npm !== null && npm !== undefined && String(npm).trim()) ? String(npm).trim() : '',
            jurusan: (jurusan !== null && jurusan !== undefined && String(jurusan).trim()) ? String(jurusan).trim() : '',
            email: (email !== null && email !== undefined && String(email).trim()) ? String(email).trim() : '',
            bio: (bio !== null && bio !== undefined && String(bio).trim()) ? String(bio).trim() : null,
            avatar_url: (avatar_url !== null && avatar_url !== undefined && String(avatar_url).trim()) ? String(avatar_url).trim() : null,
            tanggal_lahir: (tanggal_lahir !== null && tanggal_lahir !== undefined && String(tanggal_lahir).trim()) ? String(tanggal_lahir).trim() : null,
            jenis_kelamin: (jenis_kelamin !== null && jenis_kelamin !== undefined && String(jenis_kelamin).trim()) ? String(jenis_kelamin).trim() : null,
            tinggi_badan: (tinggi_badan !== null && tinggi_badan !== undefined) ? parseInt(String(tinggi_badan)) : null,
            berat_badan: (berat_badan !== null && berat_badan !== undefined) ? parseInt(String(berat_badan)) : null,
            phone: (phone !== null && phone !== undefined && String(phone).trim()) ? String(phone).trim() : null,
            alamat: (alamat !== null && alamat !== undefined && String(alamat).trim()) ? String(alamat).trim() : null
        };

        console.log('🔧 Prepared data:', prepare);

        // Update users table - explicitly cast to INTEGER for numeric fields
        // NOTE: avatar_url is only updated via the /avatar endpoint, so we don't include it here
        const userQuery = `
            UPDATE users 
            SET nama = $1,
                npm = $2,
                jurusan = $3,
                email = $4,
                bio = $5,
                tanggal_lahir = $6::DATE,
                jenis_kelamin = $7,
                tinggi_badan = $8::INTEGER,
                berat_badan = $9::INTEGER
            WHERE id = $10
            RETURNING id, nama, email, npm, jurusan, role, bio, avatar_url, 
                      tanggal_lahir, jenis_kelamin, tinggi_badan, berat_badan
        `;

        console.log('🔍 Executing UPDATE users with params:', [
            prepare.nama, prepare.npm, prepare.jurusan, prepare.email, prepare.bio,
            prepare.tanggal_lahir, prepare.jenis_kelamin,
            prepare.tinggi_badan, prepare.berat_badan, userId
        ]);

        const { rows: userRows } = await db.query(userQuery, [
            prepare.nama,
            prepare.npm,
            prepare.jurusan,
            prepare.email,
            prepare.bio,
            prepare.tanggal_lahir,
            prepare.jenis_kelamin,
            prepare.tinggi_badan,
            prepare.berat_badan,
            userId
        ]);

        if (userRows.length === 0) {
            return res.status(400).json({ success: false, error: 'User tidak ditemukan' });
        }

        const updatedUser = userRows[0];
        console.log('✅ User updated:', updatedUser);

        // Update user_profiles table
        const profileData = {
            phone: prepare.phone,
            alamat: prepare.alamat,
            bio: prepare.bio,
            avatar_url: prepare.avatar_url,
            tanggal_lahir: prepare.tanggal_lahir,
            jenis_kelamin: prepare.jenis_kelamin,
            tinggi_badan: prepare.tinggi_badan,
            berat_badan: prepare.berat_badan
        };

        const profileResult = await UserProfileModel.upsertProfileByUserId(userId, profileData);
        console.log('✅ Profile updated:', profileResult);

        // Fetch the complete updated profile from database to ensure frontend has latest data
        const completeProfile = await UserProfileModel.getProfileByUserId(userId);
        console.log('📥 Complete profile from DB:', completeProfile);

        res.json({
            success: true,
            message: 'Profil berhasil diperbarui',
            data: completeProfile
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        if (error.message && error.message.includes('duplicate key')) {
            return res.status(400).json({ success: false, error: 'Email sudah digunakan user lain' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Upload Avatar
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.userId;
        
        if (!userId) return res.status(400).json({ success: false, error: 'User ID tidak ditemukan' });
        if (!req.file) return res.status(400).json({ success: false, error: 'Tidak ada file yang diupload' });

        // Path relatif untuk disimpan di database (HARUS SAMA dengan path statis di server.js)
        // Gunakan format '/uploads/avatars/namafile.jpg'
        const avatar_url = `/uploads/avatars/${req.file.filename}`;

        const db = require('../config/db');

        // Update avatar di BOTH tables: users dan user_profiles
        // Update users table
        const userQuery = `
            UPDATE users 
            SET avatar_url = $1
            WHERE id = $2
            RETURNING id, nama, email, npm, jurusan, role, avatar_url
        `;
        
        const { rows: userRows } = await db.query(userQuery, [avatar_url, userId]);
        
        if (userRows.length === 0) {
            return res.status(400).json({ success: false, error: 'User tidak ditemukan' });
        }

        // Update user_profiles table
        await UserProfileModel.upsertProfileByUserId(userId, { avatar_url });
        
        const currentUser = userRows[0];

        console.log('✅ Avatar berhasil disimpan ke DB:', avatar_url);

        res.json({
            success: true,
            message: 'Avatar berhasil diupload',
            data: { 
                avatar_url,
                id: currentUser.id,
                nama: currentUser.nama,
                email: currentUser.email,
                role: currentUser.role || 'user'
            }
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    uploadAvatar,
    upload // Pastikan ini diekspor untuk dipakai di router
};