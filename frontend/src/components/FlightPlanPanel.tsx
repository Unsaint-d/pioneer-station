import React, { useContext, useState } from 'react';
import { AlertTriangle, Download, GripVertical, Navigation, Repeat, Trash2, X, ChevronDown, Check } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import type { ActionType } from '../types';
import { HOME_POINT_ID } from '../utils/flightPlan';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Удалить', cancelLabel = 'Отмена' }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) => {
  const context = useContext(AppContext);
  if (!isOpen) return null;
  const isDark = context?.state.darkMode;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'} border-4 border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden relative`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full border-2 border-transparent hover:border-black"><X size={20} /></button>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-lg border-2 border-red-500 text-red-500"><AlertTriangle size={24} /></div>
            <h3 className="text-2xl font-black uppercase italic">{title}</h3>
          </div>
          <p className={`${isDark ? 'text-zinc-400' : 'text-gray-600'} font-bold mb-8`}>{message}</p>
          <div className="flex gap-3">
            <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">{confirmLabel}</button>
            <button onClick={onClose} className={`flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>{cancelLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SavePlanModal = ({ onClose, onSave, defaultName, pointsCount, distance }: { onClose: () => void; onSave: (name: string) => void; defaultName: string; pointsCount: number; distance: number }) => {
  const context = useContext(AppContext);
  const [name, setName] = useState(defaultName);

  const isDark = context?.state.darkMode;
  const summaryColor = isDark ? 'text-zinc-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-black';

  const handleSave = () => {
    onSave(name.trim() || defaultName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'} border-4 border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden relative`}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full border-2 border-transparent hover:border-black"><X size={20} /></button>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg border-2 border-blue-500 text-blue-500"><Download size={24} /></div>
            <h3 className="text-2xl font-black uppercase italic">Сохранить план</h3>
          </div>
          <div className="mb-4">
            <label className="text-[10px] font-black uppercase opacity-50">Название</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') onClose();
              }}
              className={`mt-2 w-full border-2 rounded-xl px-3 py-2 font-bold text-sm outline-none focus:border-yellow-500 transition-colors ${inputBg}`}
            />
          </div>
          <div className={`text-[10px] font-bold ${summaryColor} mb-6`}>
            <div>Количество точек: {pointsCount} | Длина маршрута: {distance.toFixed(2)} м</div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex-1 bg-blue-500 text-white py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">Сохранить</button>
            <button onClick={onClose} className={`flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MissionStartModal = ({ onClose, onConfirm, hasInvalidHeights }: { onClose: () => void; onConfirm: () => void; hasInvalidHeights: boolean }) => {
  const context = useContext(AppContext);
  const [armButtonText, setArmButtonText] = useState('Отправить команду ARM');
  const [isArmButtonDisabled] = useState(false);
  const [isArmSure, setIsArmSure] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [optimisticArmed, setOptimisticArmed] = useState(false);

  if (!context) return null;
  const { state, arm, disarm, toggleAutoArm } = context;
  const isDark = state.darkMode;
  const isArmed = state.autopilotState?.toUpperCase() === 'ARMED';
  const showAsArmed = isArmed || optimisticArmed;
  const isStartEnabled = !hasInvalidHeights && (state.autoArmOnMissionStart || state.autopilotState?.toUpperCase() === 'PREFLIGHT' || state.autopilotState?.toUpperCase() === 'ARMED');

  const handleArmClick = () => {
    if (showAsArmed) {
      disarm();
      setOptimisticArmed(false);
      return;
    }

    if (!isArmSure) {
      setArmButtonText('Вы уверены?');
      setIsArmSure(true);
    } else {
      arm();
      setOptimisticArmed(true);
      setArmButtonText('Отправить команду ARM');
      setIsArmSure(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-md items-center">
        <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'} border-4 border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full overflow-hidden relative z-20`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full border-2 border-transparent hover:border-black"><X size={20} /></button>
          <div className="p-8 pb-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg border-2 border-red-500 text-red-500"><AlertTriangle size={24} /></div>
              <h3 className="text-2xl font-black uppercase italic">Вы уверены?</h3>
            </div>
            <p className={`${isDark ? 'text-zinc-400' : 'text-gray-600'} font-bold mb-6`}>
              Перед запуском полётной миссии убедитесь в правильности маршрута, возможности его безопасного исполнения и в том, что дрон находится в состоянии ARM
            </p>
            
            <button 
               onClick={handleArmClick} 
               disabled={isArmButtonDisabled}
               className={`w-full mb-6 py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${
                 isArmButtonDisabled ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed' : 
                 (showAsArmed ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600')
               }`}
            >
              {showAsArmed ? 'Выполнить DISARM' : armButtonText}
            </button>

            <div className="flex gap-3 mb-4">
              <button 
                  onClick={onConfirm} 
                  disabled={!isStartEnabled}
                  className={`flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${!isStartEnabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50' : 'bg-yellow-400 text-black hover:bg-yellow-300'}`}
              >
                  {isStartEnabled ? 'Да, я уверен' : 'Дрон не готов'}
              </button>
              <button onClick={onClose} className={`flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>Отмена</button>
            </div>
            
            <div className="flex justify-center pb-2">
                <button onClick={() => setIsDetailsOpen(!isDetailsOpen)} className={`transition-transform duration-300 ${isDetailsOpen ? 'rotate-180' : ''} opacity-30 hover:opacity-100`}>
                    <ChevronDown size={24} />
                </button>
            </div>
          </div>
        </div>

        <div className={`w-[90%] transition-all duration-300 ease-in-out origin-top ${isDetailsOpen ? 'opacity-100 max-h-[200px] translate-y-[-10px]' : 'opacity-0 max-h-0 translate-y-[-50px]'}`} style={{ zIndex: 10 }}>
            <div className={`${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-black'} border-2 border-t-0 rounded-b-xl p-4 pt-6 shadow-xl`}>
                 <div className="flex items-start gap-3 cursor-pointer" onClick={toggleAutoArm}>
                    <div className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${state.autoArmOnMissionStart ? 'bg-red-500 border-red-500' : (isDark ? 'border-zinc-500' : 'border-gray-300')}`}>
                        {state.autoArmOnMissionStart && <Check size={14} className="text-white" />}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${state.autoArmOnMissionStart ? 'text-red-500' : (isDark ? 'text-zinc-400' : 'text-gray-500')}`}>
                            Автоматически выполнять arm при запуске полётной миссии
                        </p>
                        {state.autoArmOnMissionStart && <p className="text-[10px] font-black text-red-500 mt-1 uppercase">Внимание! Двигатели запустятся автоматически!</p>}
                    </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const FlightPlanPanel = () => {
  const context = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoopConfirmOpen, setIsLoopConfirmOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isMissionConfirmOpen, setIsMissionConfirmOpen] = useState(false);

  if (!context) return null;
  const { state, setDialogOpen, setDragging, deletePoint, selectPoint, startMission, clearAllPoints, saveFlightPlanToFile, toggleLoop, enableLoopWithLandRemoval, reorderPoints } = context;
  const isDark = state.darkMode;
  const hasLandActions = state.points.some(p => p.actions.some(a => a.type === 'land'));
  const hasFlightPoints = state.points.some(p => p.id !== HOME_POINT_ID);
  const hasInvalidHeights = state.points.some(p => p.id !== HOME_POINT_ID && p.z < 0.1);
  const isDisconnected = state.connectionStatus === 'DISCONNECTED';
  const defaultPlanName = `План полёта №${state.savedPlans.length + 1}`;
  const totalDistance = state.points.reduce((acc, point, i, arr) => {
    if (i === 0) return 0;
    const prev = arr[i - 1];
    const dist = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2) + Math.pow(point.z - prev.z, 2));
    return acc + dist;
  }, 0);
  const totalDistanceRounded = parseFloat(totalDistance.toFixed(2));
  const actionLabels: Record<ActionType, string> = { photo: 'Фотоснимок', rotate: 'Поворот', wait: 'Ожидание', land: 'Посадка' };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderPoints(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
      setDraggedIndex(null);
      setDragging(false);
  };

  const handleToggleLoop = () => {
    if (state.isLooped) {
      toggleLoop();
      return;
    }
    if (hasLandActions) {
      setIsLoopConfirmOpen(true);
      setDialogOpen(true);
      return;
    }
    toggleLoop();
  };

  return (
    <>
      <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'} border-2 border-black rounded-[18px] p-5 h-full flex flex-col shadow-sm`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-black italic uppercase">План полёта</h3>
            <p className="text-[8px] font-black opacity-30 uppercase tracking-widest">Маршрутный лист</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!hasFlightPoints) return;
                setIsSaveModalOpen(true);
                setDialogOpen(true);
              }}
              disabled={!hasFlightPoints}
              className={`p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all ${isDark ? 'bg-blue-900/50 hover:bg-blue-900/80 disabled:bg-zinc-700 disabled:cursor-not-allowed' : 'bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 disabled:cursor-not-allowed'}`}
              title="Сохранить план"
            >
              <Download size={16} className={`${!hasFlightPoints ? (isDark ? 'text-zinc-500' : 'text-gray-400') : (isDark ? 'text-blue-300' : 'text-blue-500')}`} />
            </button>
            <button
              onClick={() => {
                if (state.points.length === 0) return;
                setIsModalOpen(true);
                setDialogOpen(true);
              }}
              className={`p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] transition-all ${isDark ? 'bg-red-900/50 hover:bg-red-900/80' : 'bg-red-100 hover:bg-red-200'}`}
              title="Очистить все"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
        </div>

        <button onClick={handleToggleLoop} className={`mb-3 flex items-center justify-between p-2 rounded-xl border-2 font-bold text-[10px] uppercase transition-all ${state.isLooped ? 'border-yellow-400 bg-yellow-400/10 text-yellow-600' : (isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-black/5 bg-gray-50 text-gray-400')}`}>
          <span className="flex items-center gap-2"><Repeat size={14} /> Зациклить</span>
          <div className={`w-6 h-3 rounded-full relative border border-current ${state.isLooped ? 'bg-yellow-400' : ''}`}><div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-current transition-all ${state.isLooped ? 'right-0.5' : 'left-0.5'}`} /></div>
        </button>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-1">
          {state.points.map((p, idx) => {
            const isHeightInvalid = p.id !== HOME_POINT_ID && p.z < 0.1;
            return (
            <div
              key={p.id}
              draggable={p.id !== HOME_POINT_ID}
              onDragStart={(e) => p.id !== HOME_POINT_ID && handleDragStart(e, idx)}
              onDragOver={(e) => p.id !== HOME_POINT_ID && handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => selectPoint(p.id)}
              className={`flex items-center gap-2 p-2.5 border-2 rounded-xl cursor-pointer transition-all relative group ${state.selectedPointId === p.id ? 'border-yellow-400 bg-yellow-50/10 shadow-sm' : 'border-black/5'} ${draggedIndex === idx ? 'opacity-30 scale-95 border-dashed border-gray-400' : 'opacity-100'}`}
            >
              <div className={`text-gray-300 hover:text-black transition-colors ${p.id === HOME_POINT_ID ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
                <GripVertical size={16} />
              </div>
              <div className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-black border-2 ${isHeightInvalid ? 'border-red-500' : 'border-black'} bg-black text-white shrink-0`}>{idx}</div>
              <div className="flex-1 overflow-hidden">
                <div className="text-xs font-black uppercase truncate leading-none mb-1">
                  {p.x.toFixed(1)} м. {p.y.toFixed(1)} м. {p.z.toFixed(1)} м.
                </div>
                <div className="text-[10px] font-bold opacity-60 truncate">
                  действия: {p.actions.length > 0 ? p.actions.map(a => actionLabels[a.type]).join(', ') : 'нет'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isHeightInvalid && <AlertTriangle size={12} className="text-red-500" />}
                <button disabled={p.id === HOME_POINT_ID} onClick={(e) => { e.stopPropagation(); deletePoint(p.id); }} className={`text-red-500 transition-colors ${p.id === HOME_POINT_ID ? 'cursor-not-allowed opacity-40' : 'hover:text-red-700'}`}><Trash2 size={14} /></button>
              </div>
            </div>
          )})}
          {state.isLooped && state.points.length > 1 && (
            <div className="p-2 border-2 border-dashed border-yellow-400/20 rounded-xl bg-yellow-50/5 flex items-center gap-2 text-yellow-600/80 text-[9px] font-bold uppercase">
              <Navigation size={12} />
              <span>Возврат на точку #0</span>
            </div>
          )}
        </div>
        <button 
            onClick={() => {
              setIsMissionConfirmOpen(true);
              setDialogOpen(true);
            }} 
            disabled={!hasFlightPoints || state.connectionStatus !== 'CONNECTED' || hasInvalidHeights} 
            className="w-full mt-3 bg-yellow-400 text-black py-2.5 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-300"
        >
            Запустить полётную миссию
        </button>
      </div>
      <ConfirmationModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setDialogOpen(false); }} onConfirm={() => { clearAllPoints(); setIsModalOpen(false); setDialogOpen(false); }} title="Удаление" message="Очистить маршрут?" />
      <ConfirmationModal isOpen={isLoopConfirmOpen && !isDisconnected} onClose={() => { setIsLoopConfirmOpen(false); setDialogOpen(false); }} onConfirm={() => { enableLoopWithLandRemoval(); setIsLoopConfirmOpen(false); setDialogOpen(false); }} title="Режим цикла" message="При включении режима зацикливания все действия «посадка» будут удалены и режим будет включён." confirmLabel="Ок" cancelLabel="Отмена" />
      {isSaveModalOpen && (
        <SavePlanModal
          onClose={() => { setIsSaveModalOpen(false); setDialogOpen(false); }}
          onSave={(name) => saveFlightPlanToFile(name)}
          defaultName={defaultPlanName}
          pointsCount={state.points.length}
          distance={totalDistanceRounded}
        />
      )}
      {isMissionConfirmOpen && !isDisconnected && (
        <MissionStartModal 
          onClose={() => { setIsMissionConfirmOpen(false); setDialogOpen(false); }} 
          onConfirm={() => { startMission(); setIsMissionConfirmOpen(false); setDialogOpen(false); }} 
          hasInvalidHeights={hasInvalidHeights}
        />
      )}
    </>
  );
};

export default FlightPlanPanel;
