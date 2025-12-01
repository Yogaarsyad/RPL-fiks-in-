const UserModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register user
const register = async (req, res) => {
    try {
        const { nama, email, password, npm, jurusan, tanggal_lahir, jenis_kelamin, tinggi_badan, berat_badan } = req.body;

        console.log('📝 Registration attempt for:', email);

        // Check if user already exists
        const existingUser = await UserModel.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // --- MERGE LOGIC: Menentukan Role ---
        // Jika email yang didaftarkan cocok dengan ADMIN_EMAIL di .env, otomatis jadi admin
        const role = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL === email ? 'admin' : 'user';

        // Create new user (Mengirim data mahasiswa + Role)
        const user = await UserModel.createUser({
            nama, 
            email, 
            password, 
            npm, 
            jurusan,
            role // Masukkan role ke database
        });

        // Generate token (Payload berisi ID dan Role untuk keamanan)
        const token = jwt.sign(
            { 
                userId: user.id,
                role: user.role || 'user' 
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        console.log('✅ User registered successfully:', user.email);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email,
                npm: user.npm,
                jurusan: user.jurusan,
                role: user.role // Sertakan role di response
            }
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during registration: ' + error.message
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Login attempt for:', email);

        // Find user
        const user = await UserModel.findUserByEmail(email);
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // Get complete profile data including avatar, bio, etc
        const ProfileModel = require('../models/userProfileModel');
        const profileData = await ProfileModel.getProfileByUserId(user.id);

        // Generate token (Payload digabung: ID + Role)
        const token = jwt.sign(
            { 
                userId: user.id,
                role: user.role || 'user' 
            },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful for:', user.email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: profileData || {
                id: user.id,
                nama: user.nama,
                email: user.email,
                npm: user.npm,
                jurusan: user.jurusan,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during login: ' + error.message
        });
    }
};

module.exports = {
    register,
    login
};