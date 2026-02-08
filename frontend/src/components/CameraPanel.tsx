import { useContext, useState, useEffect } from 'react';
import { CameraOff, RefreshCw, Settings, ChevronLeft, Activity, Video } from 'lucide-react';
import { AppContext } from '../context/AppContext';

export default function CameraPanel() {
  const context = useContext(AppContext);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeView, setActiveView] = useState<'video' | 'settings'>('video');
  const [processors, setProcessors] = useState<{name: string, description: string}[]>([]);
  const [activeProcessor, setActiveProcessor] = useState<string>('None');
  const [isLoadingProcessors, setIsLoadingProcessors] = useState(false);
  const [videoSource, setVideoSource] = useState<'drone' | 'local'>('drone');
  const [isDevMode, setIsDevMode] = useState(false);
  
  const streamUrl = `http://localhost:8000/camera/stream?t=${refreshKey}`;

  if (!context) return null;
  const { state } = context;
  const isDark = state.darkMode;

  useEffect(() => {
    if (!isDevMode && videoSource !== 'drone') {
      handleSetSource('drone');
    }
  }, [isDevMode]);

  useEffect(() => {
    if (isSettingsOpen) {
      setIsLoadingProcessors(true);
      
      fetch('http://localhost:8000/processors/list')
        .then(res => res.json())
        .then(data => {
          setProcessors(data);
          return fetch('http://localhost:8000/processors/active');
        })
        .then(res => res.json())
        .then(data => {
          setActiveProcessor(data || 'None');
        })
        .catch(err => console.error('Failed to fetch processors:', err))
        .finally(() => setIsLoadingProcessors(false));

      fetch('http://localhost:8000/camera/source')
        .then(res => res.json())
        .then(data => setVideoSource(data.source))
        .catch(err => console.error('Failed to fetch video source:', err));
    }
  }, [isSettingsOpen]);

  const handleSetProcessor = async (name: string) => {
    try {
      await fetch('http://localhost:8000/processors/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      setActiveProcessor(name);
    } catch (err) {
      console.error('Failed to set processor:', err);
    }
  };

  const handleSetSource = async (source: 'drone' | 'local') => {
    try {
      await fetch('http://localhost:8000/camera/source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      setVideoSource(source);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Failed to set video source:', err);
    }
  };

  const handleRetry = () => {
    setError(false);
    setRefreshKey(prev => prev + 1);
  };

  const toggleSettings = () => {
    if (activeView === 'video') {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveView('settings');
        setIsSettingsOpen(true);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 100);
    } else {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveView('video');
        setIsSettingsOpen(false);
        setTimeout(() => setIsTransitioning(false), 50);
      }, 100);
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-black'} rounded-[18px] border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-colors`}>
      <div className={`p-4 border-b-2 border-black flex items-center justify-between shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSettings}
            className={`w-9 h-9 flex items-center justify-center border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all ${isDark ? 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:text-white hover:bg-zinc-700' : 'bg-white text-zinc-600 hover:text-black hover:bg-zinc-50'}`}
            title={isSettingsOpen ? "Назад к камере" : "Настройки камеры"}
          >
            {isSettingsOpen ? <ChevronLeft size={20} /> : <Settings size={20} />}
          </button>
          <h2 className={`font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}>
            <i><b>Камера дрона</b></i>
          </h2>
        </div>
      </div>
      
      <div className={`flex-1 relative overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
        <div className={`absolute inset-0 flex flex-col transition-opacity duration-100 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          
          {activeView === 'video' ? (
            <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
               <div className="relative w-full h-full max-w-full max-h-full aspect-[4/3] mx-auto">
                {!error ? (
                  <img 
                    src={streamUrl} 
                    alt="Drone Camera Feed" 
                    className="w-full h-full object-contain"
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
          ) : (
            <div className="w-full h-full p-6 overflow-y-auto">
              <div className="flex flex-col gap-6">

                <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                  <div className="flex flex-col">
                     <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>Режим разработчика</span>
                     <span className="text-xs opacity-50">Дополнительные настройки отладки</span>
                  </div>
                  <button 
                    onClick={() => setIsDevMode(!isDevMode)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${isDevMode ? 'bg-purple-500' : (isDark ? 'bg-zinc-700' : 'bg-zinc-300')}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isDevMode ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {isDevMode && (
                  <div className={`p-4 rounded-xl border-2 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                    <h3 className={`font-black uppercase text-sm mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <Video size={16} />
                      Источник видео
                    </h3>
                    
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${videoSource === 'drone' ? (isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50') : (isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-200 hover:border-zinc-300')}`}>
                        <input 
                          type="radio" 
                          name="source" 
                          checked={videoSource === 'drone'}
                          onChange={() => handleSetSource('drone')}
                          className="w-4 h-4 accent-purple-500"
                        />
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>Камера дрона</span>
                          <span className="text-xs opacity-50">Wi-Fi соединение с пионером</span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${videoSource === 'local' ? (isDark ? 'border-purple-500 bg-purple-900/20' : 'border-purple-500 bg-purple-50') : (isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-200 hover:border-zinc-300')}`}>
                        <input 
                          type="radio" 
                          name="source" 
                          checked={videoSource === 'local'}
                          onChange={() => handleSetSource('local')}
                          className="w-4 h-4 accent-purple-500"
                        />
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>Веб-камера компьютера</span>
                          <span className="text-xs opacity-50">Локальная камера для тестирования</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
                
                <div className={`p-4 rounded-xl border-2 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                  <h3 className={`font-black uppercase text-sm mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    <Activity size={16} />
                    Нейросетевая обработка
                  </h3>
                  
                  {isLoadingProcessors ? (
                    <div className="text-center py-4 opacity-50 text-sm font-bold">Загрузка списка моделей...</div>
                  ) : (
                    <div className="space-y-2">
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${activeProcessor === 'None' || !activeProcessor ? (isDark ? 'border-green-500 bg-green-900/20' : 'border-green-500 bg-green-50') : (isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-200 hover:border-zinc-300')}`}>
                        <input 
                          type="radio" 
                          name="processor" 
                          checked={activeProcessor === 'None' || !activeProcessor}
                          onChange={() => handleSetProcessor('None')}
                          className="w-4 h-4 accent-green-500"
                        />
                        <div className="flex flex-col">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>Без обработки</span>
                          <span className="text-xs opacity-50">Оригинальный поток с камеры</span>
                        </div>
                      </label>

                      {processors.map(proc => (
                        <label key={proc.name} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${activeProcessor === proc.name ? (isDark ? 'border-blue-500 bg-blue-900/20' : 'border-blue-500 bg-blue-50') : (isDark ? 'border-zinc-700 hover:border-zinc-500' : 'border-zinc-200 hover:border-zinc-300')}`}>
                          <input 
                            type="radio" 
                            name="processor" 
                            checked={activeProcessor === proc.name}
                            onChange={() => handleSetProcessor(proc.name)}
                            className="w-4 h-4 accent-blue-500"
                          />
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{proc.name}</span>
                            <span className="text-xs opacity-50">{proc.description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`w-full border-2 border-dashed ${isDark ? 'border-zinc-800' : 'border-zinc-300'} rounded-xl p-6 flex items-center justify-center flex-col gap-4 opacity-50`}>
                  <Settings size={32} className={isDark ? 'text-zinc-800' : 'text-zinc-300'} />
                  <p className="text-zinc-500 text-xs text-center max-w-xs">
                    Дополнительные настройки разрешения и экспозиции скоро будут доступны.
                  </p>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
