import React, { useState } from 'react';
import { useLog } from '../context/useLog';
import FoodLogList from '../components/FoodLogList';
import ExerciseLogList from '../components/ExerciseLogList';
import SleepLogList from '../components/SleepLogList';
import ExportButton from '../components/ExportButton';
import { FiCoffee, FiActivity, FiMoon, FiDownload, FiCalendar } from 'react-icons/fi';

/// 
function ActivityHistory() {
  const [activeTab, setActiveTab] = useState('food');
  const { foodLogs, exerciseLogs, sleepLogs } = useLog();

  // --- LOGIKA EXPORT DATA ---
  const getExportData = () => {
    switch (activeTab) {
      case 'food':
        return foodLogs.map(log => ({
          Date: log.tanggal,
          'Food Name': log.nama_makanan,
          Calories: log.kalori,
          'Logged At': log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'
        }));
      case 'exercise':
        return exerciseLogs.map(log => ({
          Date: log.tanggal,
          Activity: log.nama_olahraga,
          'Duration (min)': log.durasi_menit,
          'Calories Burned': log.kalori_terbakar,
          'Logged At': log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'
        }));
      case 'sleep':
        return sleepLogs.map(log => ({
          Date: log.tanggal,
          'Sleep Time': log.waktu_tidur ? new Date(log.waktu_tidur).toLocaleString() : 'N/A',
          'Wake Up Time': log.waktu_bangun ? new Date(log.waktu_bangun).toLocaleString() : 'N/A',
          Quality: log.kualitas_tidur,
          'Logged At': log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'
        }));
      default: return [];
    }
  };

  // --- RENDER LIST KOMPONEN ---
  const renderList = () => {
    switch (activeTab) {
      case 'food': return <FoodLogList />;
      case 'exercise': return <ExerciseLogList />;
      case 'sleep': return <SleepLogList />;
      default: return <FoodLogList />;
    }
  };

  const getCurrentDataCount = () => {
    switch (activeTab) {
      case 'food': return foodLogs.length;
      case 'exercise': return exerciseLogs.length;
      case 'sleep': return sleepLogs.length;
      default: return 0;
    }
  };

  // --- DEFINISI STYLE WARNA EKSPLISIT (Agar Tailwind Membacanya) ---
  const tabConfig = {
    food: {
      label: 'Food',
      icon: <FiCoffee />,
      activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-500',
      inactiveClass: 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border-transparent',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    exercise: {
      label: 'Exercise',
      icon: <FiActivity />,
      activeClass: 'bg-green-600 text-white shadow-lg shadow-green-500/30 border-green-500',
      inactiveClass: 'text-slate-400 hover:text-green-400 hover:bg-green-500/10 border-transparent',
      badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    sleep: {
      label: 'Sleep',
      icon: <FiMoon />,
      activeClass: 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 border-purple-500',
      inactiveClass: 'text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 border-transparent',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 pb-20">
      
      {/* Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
                <FiCalendar className="text-white text-xl" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Activity History</h1>
            </div>
            <p className="text-slate-400 ml-14 max-w-lg">
              Manage and export your complete health journey records.
            </p>
          </div>
          
          <ExportButton 
            data={getExportData()} 
            filename={`${activeTab}-history`}
            className="flex items-center px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl group"
          >
            <FiDownload className="mr-2 group-hover:translate-y-0.5 transition-transform" />
            Export Data
          </ExportButton>
        </div>

        {/* TAB NAVIGATION (WARNA SESUAI KATEGORI) */}
        <div className="bg-slate-800/50 p-1.5 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-2 sm:space-x-1 max-w-lg border border-white/5">
          {Object.keys(tabConfig).map((key) => {
            const tab = tabConfig[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-3 px-4 text-center font-semibold text-sm rounded-xl transition-all duration-300 flex items-center justify-center border ${
                  isActive ? tab.activeClass : tab.inactiveClass
                }`}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* MAIN CONTENT CARD */}
        <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          
          {/* Card Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-900/30">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white capitalize">
                {activeTab} Records
              </h2>
              <span className={`px-3 py-1 text-xs font-bold rounded-full border ${tabConfig[activeTab].badgeClass}`}>
                {getCurrentDataCount()} Items
              </span>
            </div>
            
            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              Showing recent history
            </div>
          </div>

          {/* Render List Content */}
          <div className="p-6 min-h-[400px]">
            <div className="animate-fade-in">
              {renderList()}
            </div>
          </div>
        </div>

        {/* QUICK STATS FOOTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            label="Total Meals" 
            value={foodLogs.length} 
            icon={<FiCoffee />} 
            color="blue" 
          />
          <StatCard 
            label="Workouts" 
            value={exerciseLogs.length} 
            icon={<FiActivity />} 
            color="green" 
          />
          <StatCard 
            label="Sleep Logs" 
            value={sleepLogs.length} 
            icon={<FiMoon />} 
            color="purple" 
          />
        </div>

      </div>
    </div>
  );
}

// Sub-Component StatCard
function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };
  
  const colorClass = colors[color] || colors.blue;
  const [textColor, bgColor, borderColor] = colorClass.split(' ');

  return (
    <div className={`flex items-center p-4 rounded-2xl border ${borderColor} ${bgColor} backdrop-blur-sm`}>
      <div className={`p-3 rounded-xl mr-4 bg-white/5 ${textColor}`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

export default ActivityHistory;