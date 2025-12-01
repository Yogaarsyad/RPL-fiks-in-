const db = require('../config/db');

/**
 * Mengambil data gabungan dari users dan user_profiles
 * Prioritas data: users table terlebih dahulu untuk fields yang ada di kedua table
 */
const getProfileByUserId = async (userId) => {
    try {
        console.log('📋 Getting profile for user ID:', userId);
        
        const query = `
            SELECT 
                u.id, u.nama, u.email, u.npm, u.jurusan, u.role,
                u.bio, u.avatar_url, u.tanggal_lahir, u.jenis_kelamin, 
                u.tinggi_badan, u.berat_badan,
                COALESCE(up.phone, NULL) as phone,
                COALESCE(up.alamat, NULL) as alamat,
                COALESCE(up.created_at, u.created_at) as created_at,
                COALESCE(up.updated_at, u.created_at) as updated_at
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = $1
        `;
        
        console.log('📝 Executing profile query for user:', userId);
        const { rows } = await db.query(query, [userId]);
        
        console.log('✅ Profile query result:', rows[0] ? 'Found' : 'Not found');
        return rows[0] || null;
    } catch (error) {
        console.error('❌ Error in getProfileByUserId:', error);
        throw new Error(`Failed to get profile: ${error.message}`);
    }
};

/**
 * Meng-update atau Meng-insert profil di tabel user_profiles
 */
const upsertProfileByUserId = async (userId, profileData) => {
    const { 
        phone, alamat, bio, avatar_url,
        tanggal_lahir, jenis_kelamin, tinggi_badan, berat_badan 
    } = profileData;
    
    try {
        console.log('🔄 Upserting profile for user ID:', userId);
        console.log('📦 Profile data:', profileData);
        
        const query = `
            INSERT INTO user_profiles (
                user_id, phone, alamat, bio, avatar_url, 
                tanggal_lahir, jenis_kelamin, tinggi_badan, berat_badan, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET
                phone = EXCLUDED.phone,
                alamat = EXCLUDED.alamat,
                bio = EXCLUDED.bio,
                avatar_url = EXCLUDED.avatar_url,
                tanggal_lahir = EXCLUDED.tanggal_lahir,
                jenis_kelamin = EXCLUDED.jenis_kelamin,
                tinggi_badan = EXCLUDED.tinggi_badan,
                berat_badan = EXCLUDED.berat_badan,
                updated_at = NOW()
            RETURNING *
        `;
        
        const params = [
            userId, 
            phone, 
            alamat, 
            bio, 
            avatar_url,
            tanggal_lahir,
            jenis_kelamin,
            tinggi_badan,
            berat_badan
        ];
        
        console.log('📝 Executing upsert query with params:', params);
        const { rows } = await db.query(query, params);
        
        console.log('✅ Profile upsert successful');
        return rows[0];
    } catch (error) {
        console.error('❌ Error in upsertProfileByUserId:', error);
        console.error('Error details:', error.message);
        throw new Error(`Failed to update profile: ${error.message}`);
    }
};

// EKSPOR FUNGSI DENGAN BENAR
module.exports = {
    getProfileByUserId,
    upsertProfileByUserId
};