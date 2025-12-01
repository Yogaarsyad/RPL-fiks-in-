import React, { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile, uploadAvatar } from '../services/api';
import { 
  FiCamera, FiSave, FiUser, FiMail, FiPhone, FiMapPin, 
  FiActivity, FiTarget, FiCheckCircle, FiEdit3, FiLoader 
} from 'react-icons/fi';

function ProfilePage() {
  
  // --- 1. HELPER URL GAMBAR (PERBAIKAN) ---
  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    // Pastikan tidak ada double slash
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:5000${cleanUrl}`;
  };

  // --- 2. LOAD DATA AWAL ---
  const getInitialData = () => {
    const savedUser = localStorage.getItem('user');
    const parsed = savedUser ? JSON.parse(savedUser) : {};
    return {
      nama: parsed.nama || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      alamat: parsed.alamat || '', 
      bio: parsed.bio || '',
      tinggi_badan: parsed.tinggi_badan || '',
      berat_badan: parsed.berat_badan || '',
      avatar_url: parsed.avatar_url || ''
    };
  };

  const [profile, setProfile] = useState(getInitialData);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // --- 3. SYNC DENGAN SERVER SAAT LOAD ---
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const response = await getProfile();
        console.log('🔄 Fetching profile on page load, response:', response);
        
        if (response?.data) {
          // PERBAIKAN: response.data adalah { success, data: {...profile} }
          // Jadi kita perlu mengambil response.data.data, bukan response.data
          const apiData = response.data.data || response.data;
          console.log('✅ Profile data from API:', apiData);
          
          setProfile(prev => ({
            ...prev,
            ...apiData,
            alamat: apiData.alamat || '',
            tinggi_badan: apiData.tinggi_badan || '',
            berat_badan: apiData.berat_badan || ''
          }));
          
          // Update Local Storage
          const currentLocal = JSON.parse(localStorage.getItem('user') || '{}');
          const mergedUser = { ...currentLocal, ...apiData };
          localStorage.setItem('user', JSON.stringify(mergedUser));
          console.log('💾 Updated localStorage with:', mergedUser);
          
          // Update Header Otomatis
          window.dispatchEvent(new Event('user-updated'));
        }
      } catch (error) {
        console.error("Background sync failed:", error);
      }
    };
    fetchLatestProfile();
  }, []);

  // --- UPDATE PREVIEW SAAT PROFILE BERUBAH ---
  useEffect(() => {
    if (profile.avatar_url) {
      setImagePreview(getFullImageUrl(profile.avatar_url));
    } else {
      setImagePreview(getDefaultAvatar(profile.nama));
    }
  }, [profile.avatar_url, profile.nama]);

  const getDefaultAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=0ea5e9&color=fff&size=150`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // --- 4. LOGIKA UPLOAD FOTO (PERBAIKAN UTAMA) ---
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validasi ukuran file
    if (file.size > 5 * 1024 * 1024) {
      alert('Maksimal ukuran file 5MB');
      return;
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar');
      return;
    }

    try {
      setUploading(true);
      
      // Preview lokal sementara
      const tempPreview = URL.createObjectURL(file);
      setImagePreview(tempPreview);

      // Upload ke server
      const formData = new FormData();
      formData.append('avatar', file);
      
      console.log('Uploading avatar...');
      const response = await uploadAvatar(formData);
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response structure:', JSON.stringify(response, null, 2));

      // Parse response - backend returns { success, message, data: { avatar_url, ... } }
      const responseData = response?.data;
      let newAvatarUrl = responseData?.data?.avatar_url;
      
      console.log('📸 Avatar response structure:', { responseData, newAvatarUrl });

      if (newAvatarUrl) {
        console.log('New avatar URL found:', newAvatarUrl);
        
        // Update state profile
        setProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
        
        // Update localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...user, avatar_url: newAvatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Trigger event untuk update header
        window.dispatchEvent(new Event('user-updated'));
        
        // Cleanup temp preview
        URL.revokeObjectURL(tempPreview);
        
        // Set preview dengan URL server
        setImagePreview(getFullImageUrl(newAvatarUrl));
        
        alert("Foto profil berhasil diperbarui!");
      } else {
        console.error('Avatar URL not found in response');
        throw new Error('Avatar URL not found in server response. Check console for response structure.');
      }
    } catch (error) {
      console.error("Upload failed:", error);
      console.error("Error details:", error.response);
      alert(`Gagal upload foto: ${error.message}`);
      
      // Kembalikan ke preview sebelumnya
      if (profile.avatar_url) {
        setImagePreview(getFullImageUrl(profile.avatar_url));
      } else {
        setImagePreview(getDefaultAvatar(profile.nama));
      }
    } finally {
      setUploading(false);
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- 5. LOGIKA SIMPAN DATA ---
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nama: profile.nama,
        email: profile.email,
        phone: profile.phone || null,
        alamat: profile.alamat || null,
        bio: profile.bio || null,
        tinggi_badan: profile.tinggi_badan ? parseInt(profile.tinggi_badan) : null,
        berat_badan: profile.berat_badan ? parseInt(profile.berat_badan) : null,
      };

      console.log('📤 Sending payload:', payload);
      const response = await updateProfile(payload);
      console.log('📥 Full response:', response);
      console.log('📥 response.data:', response?.data);
      console.log('📥 response.data.data:', response?.data?.data);
      
      // Update dengan data lengkap yang dikembalikan dari server
      const updatedData = response?.data?.data || response?.data || {};
      console.log('✅ Updated data from response:', updatedData);
      
      setProfile(prev => ({
        ...prev,
        ...updatedData
      }));
      
      // Update localStorage dengan semua data yang dikembalikan server
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const newUser = { ...user, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUser));
      console.log('💾 Saved to localStorage:', newUser);
      
      window.dispatchEvent(new Event('user-updated'));
      alert("Profil berhasil disimpan!");
    } catch (error) {
      console.error("Update error:", error);
      console.error("Error details:", error.response?.data || error.message);
      alert("Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  const calculateBMI = () => {
    if (!profile.tinggi_badan || !profile.berat_badan) return 0;
    const h = profile.tinggi_badan / 100;
    return (profile.berat_badan / (h * h)).toFixed(1);
  };

  const isHealthDataComplete = profile.tinggi_badan && profile.berat_badan;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 pb-20 relative">
      
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 z-0"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 relative z-10">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* KARTU PROFIL (KIRI) */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            
            <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 text-center shadow-2xl mt-6">
              <div className="relative inline-block -mt-24 mb-4 group">
                <img 
                  src={imagePreview || getDefaultAvatar(profile.nama)} 
                  alt="Profile"
                  className="w-36 h-36 rounded-full object-cover border-[6px] border-slate-900 shadow-2xl transition-transform group-hover:scale-105 bg-slate-700"
                  onError={(e) => {
                    console.error('Image load error');
                    e.target.src = getDefaultAvatar(profile.nama);
                  }}
                />
                <button 
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  type="button"
                  className="absolute bottom-2 right-2 bg-blue-500 text-white p-3 rounded-full hover:bg-blue-400 transition-all shadow-lg border-4 border-slate-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? <FiLoader className="animate-spin" /> : <FiCamera />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" 
                  onChange={handleAvatarChange} 
                />
              </div>

              <h2 className="text-2xl font-bold text-white">{profile.nama || 'Your Name'}</h2>
              <p className="text-slate-400 text-sm mb-6">{profile.email}</p>

              <div className="flex justify-center gap-2 mb-6">
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30 flex items-center">
                  <FiCheckCircle className="mr-1" /> Active
                </span>
                {calculateBMI() > 0 && (
                   <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full border border-purple-500/30 flex items-center">
                     <FiActivity className="mr-1" /> BMI: {calculateBMI()}
                   </span>
                )}
              </div>

              <p className="text-slate-400 text-sm italic bg-slate-900/50 p-3 rounded-xl border border-white/5">
                "{profile.bio || "Write something about yourself..."}"
              </p>
            </div>

            <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-lg">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Stats</h3>
                <div className="space-y-3">
                   <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl border border-white/5">
                      <span className="text-slate-300 text-sm flex items-center">
                        <FiUser className="mr-2 text-blue-400"/> Profile Status
                      </span>
                      <span className="text-green-400 text-sm font-bold">100%</span>
                   </div>
                   
                   <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl border border-white/5">
                      <span className="text-slate-300 text-sm flex items-center">
                        <FiTarget className="mr-2 text-purple-400"/> Health Data
                      </span>
                      <span className={`text-sm font-bold ${isHealthDataComplete ? 'text-blue-400' : 'text-slate-500'}`}>
                         {isHealthDataComplete ? 'Complete' : 'Empty'}
                      </span>
                   </div>
                </div>
            </div>

          </div>

          {/* FORM EDIT (KANAN) */}
          <div className="lg:w-2/3">
             <div className="bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl mt-6">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                   <h3 className="text-xl font-bold text-white flex items-center">
                      <FiEdit3 className="mr-2 text-blue-500" /> Edit Information
                   </h3>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                   
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Personal Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="group">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                            <input type="text" name="nama" value={profile.nama} onChange={handleChange}
                               className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" />
                         </div>
                         <div className="group">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                            <input type="email" name="email" value={profile.email} disabled
                               className="w-full bg-slate-900/30 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed" />
                         </div>
                         <div className="group">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                            <input type="tel" name="phone" value={profile.phone} onChange={handleChange}
                               className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" placeholder="+62..." />
                         </div>
                         <div className="group">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Address</label>
                            <div className="relative">
                                <FiMapPin className="absolute left-4 top-3.5 text-slate-500" />
                                <input type="text" name="alamat" value={profile.alamat} onChange={handleChange}
                                className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none" placeholder="City, Country" />
                            </div>
                         </div>
                      </div>

                      <div className="group mt-4">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Bio</label>
                            <textarea name="bio" rows="2" value={profile.bio} onChange={handleChange}
                               className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none resize-none" placeholder="Describe yourself..." />
                      </div>
                   </div>

                   <div className="pt-4 border-t border-white/10 space-y-4">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Health Metrics</h4>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="group">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Height (cm)</label>
                            <input type="number" name="tinggi_badan" value={profile.tinggi_badan} onChange={handleChange}
                               className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all outline-none" placeholder="170" />
                         </div>
                         <div className="group">
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Weight (kg)</label>
                            <input type="number" name="berat_badan" value={profile.berat_badan} onChange={handleChange}
                               className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all outline-none" placeholder="60" />
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-white/10 flex justify-end">
                      <button type="submit" disabled={saving} 
                         className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                         {saving ? <FiLoader className="animate-spin" /> : <FiSave />}
                         {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                   </div>

                </form>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ProfilePage;