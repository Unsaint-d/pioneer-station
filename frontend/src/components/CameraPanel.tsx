import React, { useContext, useState } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
import { AppContext } from '../context/AppContext';

export default function CameraPanel() {
  const context = useContext(AppContext);
  const [error, setError] = useState(false);
  // Use a timestamp to force refresh the image source on retry
  const [refreshKey, setRefreshKey] = useState(0);
  const streamUrl = `http://localhost:8000/camera/stream?t=${refreshKey}`;

  if (!context) return null;
  const { state } = context;
  const isDark = state.darkMode;

  const handleRetry = () => {
    setError(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-black'} rounded-[18px] border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-colors`}>
      <div className={`p-4 border-b-2 border-black flex items-center justify-between ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
        <h2 className={`font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
          <Camera size={20} />
          Камера дрона
        </h2>
        {/* Connection indicator or settings could go here */}
      </div>
      
      <div className={`flex-1 flex flex-col min-h-0 ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'} relative overflow-hidden`}>
        {/* Video Section - Fixed Aspect Ratio 4:3 */}
        <div className="w-full bg-black relative shrink-0">
          <div className="w-full aspect-[4/3] relative">
            {!error ? (
              <img 
                src={streamUrl} 
                alt="Drone Camera Feed" 
                className="absolute inset-0 w-full h-full object-contain"
                onError={() => setError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white flex flex-col items-center gap-2 opacity-50">
                  <CameraOff size={48} />
                  <span className="font-bold">Нет сигнала</span>
                  <button 
                    onClick={handleRetry}
                    className={`mt-4 px-4 py-2 ${isDark ? 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700' : 'bg-white border-zinc-300 text-black hover:bg-zinc-100'} border font-bold rounded flex items-center gap-2 transition-colors`}
                  >
                    <RefreshCw size={16} />
                    Повторить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings Placeholder Section */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`w-full h-full min-h-[100px] border-2 border-dashed ${isDark ? 'border-zinc-800' : 'border-zinc-300'} rounded-xl flex items-center justify-center`}>
            <span className="text-zinc-400 font-bold text-sm uppercase tracking-wider">Место для настроек</span>
          </div>
        </div>
      </div>
    </div>
  );
}
