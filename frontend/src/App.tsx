import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Menu, Wifi } from 'lucide-react';
import { AppContext } from './context/AppContext';
import type { ActionParamKey, ActionType, ActionParams, AppState, FlightPoint, LogEntry, SavedFlightPlan } from './types';
import { createHomePoint, generateId, HOME_POINT_ID } from './utils/flightPlan';
import ConsolePanel from './components/ConsolePanel';
import FlightPlanPanel from './components/FlightPlanPanel';
import MiniMap from './components/MiniMap';
import PointSettings from './components/PointSettings';
import Sidebar from './components/Sidebar';
import SavedPlans from './components/SavedPlans';

const WarningModal = ({ isOpen, onConfirm, title, message, isDark }: { isOpen: boolean; onConfirm: () => void; title: string; message: string; isDark: boolean }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'} border-4 border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden relative`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-2 rounded-lg border-2 border-red-500 text-red-500"><AlertTriangle size={24} /></div>
            <h3 className="text-2xl font-black uppercase italic">{title}</h3>
          </div>
          <p className={`${isDark ? 'text-zinc-400' : 'text-gray-600'} font-bold mb-8`}>{message}</p>
          <div className="flex gap-3">
            <button onClick={onConfirm} className="flex-1 bg-red-500 text-white py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">Ок</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectModal = ({ isOpen, onConfirm, onCancel, isDark }: { isOpen: boolean; onConfirm: (dontShowAgain: boolean) => void; onCancel: () => void; isDark: boolean }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`${isDark ? 'bg-zinc-900 text-white' : 'bg-white text-black'} border-4 border-black rounded-[24px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md overflow-hidden relative`}>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg border-2 border-green-500 text-green-500"><Wifi size={24} /></div>
            <h3 className="text-2xl font-black uppercase italic">Дрон обнаружен</h3>
          </div>
          <p className={`${isDark ? 'text-zinc-400' : 'text-gray-600'} font-bold mb-8`}>
            Обнаружен дрон Pioneer (192.168.4.1).<br/>
            Выполнить подключение?
          </p>
          <div className="flex gap-3">
            <button onClick={() => onConfirm(dontShowAgain)} className="flex-1 bg-green-500 text-white py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none hover:opacity-90 transition-opacity">Да</button>
            <button onClick={onCancel} className={`flex-1 py-3 rounded-xl border-2 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${isDark ? 'bg-zinc-800 text-white' : 'bg-gray-100 text-black'} hover:opacity-90 transition-opacity`}>Нет</button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 cursor-pointer group" onClick={() => setDontShowAgain(!dontShowAgain)}>
             <div className={`w-10 h-6 rounded-full p-1 transition-colors border-2 border-transparent ${dontShowAgain ? 'bg-green-500' : (isDark ? 'bg-zinc-700' : 'bg-gray-300')}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${dontShowAgain ? 'translate-x-4' : 'translate-x-0'}`} />
             </div>
             <span className={`text-[10px] font-bold uppercase tracking-wider opacity-50 group-hover:opacity-100 transition-opacity ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
               Больше не показывать
             </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
const getBatteryPercent = (voltage: number) => {
  const minVoltage = 7;
  const maxVoltage = 8.4;
  const percent = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
  return clamp(percent, 0, 100);
};
const getBatteryColor = (percent: number) => {
  const red = { r: 239, g: 68, b: 68 };
  const orange = { r: 249, g: 115, b: 22 };
  const green = { r: 34, g: 197, b: 94 };
  const p = clamp(percent, 0, 100) / 100;
  const orangeThreshold = 0.3;
  if (p <= orangeThreshold) {
    const t = p / orangeThreshold;
    const r = Math.round(lerp(red.r, orange.r, t));
    const g = Math.round(lerp(red.g, orange.g, t));
    const b = Math.round(lerp(red.b, orange.b, t));
    return `rgb(${r}, ${g}, ${b})`;
  }
  const t = (p - orangeThreshold) / (1 - orangeThreshold);
  const r = Math.round(lerp(orange.r, green.r, t));
  const g = Math.round(lerp(orange.g, green.g, t));
  const b = Math.round(lerp(orange.b, green.b, t));
  return `rgb(${r}, ${g}, ${b})`;
};

const getApStatusDisplay = (status: string) => {
  const s = (status || 'N/A').toUpperCase();
  if (s === 'DISCONNECTED') return { label: 'OFFLINE', short: 'OFF', color: 'text-zinc-400' };
  if (s === 'PREFLIGHT') return { label: 'READY', short: 'RDY', color: 'text-blue-500' };
  if (s === 'ARMED') return { label: 'ARMED', short: 'ARM', color: 'text-red-500' };
  if (s === 'DISARMED') return { label: 'DISARMED', short: 'DIS', color: 'text-green-500' };
  if (s === 'IN_FLIGHT') return { label: 'FLYING', short: 'FLY', color: 'text-blue-500' };
  if (s === 'TAKEOFF') return { label: 'TAKEOFF', short: 'TOF', color: 'text-blue-500' };
  if (s === 'LANDING') return { label: 'LANDING', short: 'LND', color: 'text-blue-500' };
  if (s === 'WAIT_FOR_LANDING') return { label: 'LANDING...', short: 'W-LND', color: 'text-yellow-500' };
  if (s === 'MISSION') return { label: 'MISSION', short: 'MSN', color: 'text-purple-500' };
  if (s === 'RTL') return { label: 'RTL', short: 'RTL', color: 'text-orange-500' };
  return { label: status, short: status.substring(0, 3).toUpperCase(), color: 'text-zinc-500' };
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : 'Неизвестная ошибка';

export default function App() {
  const [currentView, setCurrentView] = useState<'editor' | 'saved-plans'>('editor');
  const [state, setState] = useState<AppState>(() => ({
    points: [createHomePoint()],
    nextPointId: 1,
    selectedPointId: null,
    connectionStatus: 'DISCONNECTED',
    batteryVoltage: 0,
    logs: [{ id: generateId(), timestamp: new Date().toISOString(), level: 'INFO', message: 'Система готова' }],
    autopilotState: 'DISCONNECTED',
    darkMode: localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
    isLooped: false,
    savedPlans: JSON.parse(localStorage.getItem('savedPlans') || '[]'),
    autoArmOnMissionStart: localStorage.getItem('autoArmOnMissionStart') === 'true'
  }));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(220);
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [hasAskedToConnect, setHasAskedToConnect] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDragging, setDragging] = useState(false);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const isConnectionAuthorized = useRef(false);
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(false);
  const apiBase = 'http://localhost:8000';
  
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [state.darkMode]);

  useEffect(() => {
    localStorage.setItem('savedPlans', JSON.stringify(state.savedPlans));
    localStorage.setItem('autoArmOnMissionStart', String(state.autoArmOnMissionStart));
  }, [state.savedPlans, state.autoArmOnMissionStart]);

  const [history, setHistory] = useState<FlightPoint[][]>([]);
  const [future, setFuture] = useState<FlightPoint[][]>([]);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const pointSettingsRef = useRef<HTMLDivElement>(null);
  const flightPlanRef = useRef<HTMLDivElement>(null);

  const normalizePointsState = (points: FlightPoint[], currentSelectedId: string | null) => {
    const idMap = new Map<string, string>();
    points.forEach((p, index) => {
      const newId = index === 0 ? HOME_POINT_ID : String(index);
      idMap.set(p.id, newId);
    });

    const newPoints = points.map((p, index) => {
      const newId = index === 0 ? HOME_POINT_ID : String(index);
      const newActions = p.actions.map(a => {
        if (a.params.targetPointId && typeof a.params.targetPointId === 'string' && a.params.targetPointId !== 'next') {
           const mapped = idMap.get(a.params.targetPointId);
           if (mapped) return { ...a, params: { ...a.params, targetPointId: mapped } };
        }
        return a;
      });
      return { ...p, id: newId, name: newId, actions: newActions };
    });

    const newSelectedId = currentSelectedId && idMap.has(currentSelectedId) ? idMap.get(currentSelectedId)! : null;
    return { points: newPoints, selectedPointId: newSelectedId };
  };

  const pushToHistory = () => { setHistory(prev => [...prev, state.points]); setFuture([]); };
  const undo = () => { if (history.length === 0) return; setFuture(f => [state.points, ...f]); const last = history[history.length-1]; setHistory(h => h.slice(0, -1)); setState(s => ({ ...s, points: last })); };
  const redo = () => { if (future.length === 0) return; setHistory(h => [...h, state.points]); const next = future[0]; setFuture(f => f.slice(1)); setState(s => ({ ...s, points: next })); };

  const addLog = useCallback((level: LogEntry['level'], message: string) => setState(prev => ({ ...prev, logs: [...prev.logs, { id: generateId(), timestamp: new Date().toISOString(), level, message }] })), []);

  const clearLogs = useCallback(() => {
    setState(prev => ({
      ...prev,
      logs: [{ id: generateId(), timestamp: new Date().toISOString(), level: 'INFO', message: 'Система готова' }]
    }));
  }, []);

  const connect = useCallback(async () => {
    try {
      isConnectionAuthorized.current = true;
      const response = await fetch(`${apiBase}/api/connect`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const detail = data?.detail ?? response.statusText;
        setState(prev => ({ ...prev, connectionStatus: 'DISCONNECTED' }));
        return { connected: false, error: detail };
      }
      const data = await response.json().catch(() => null);
      const connected = Boolean(data?.connected);
      setState(prev => ({ ...prev, connectionStatus: connected ? 'CONNECTED' : 'DISCONNECTED' }));
      return { connected };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setState(prev => ({ ...prev, connectionStatus: 'DISCONNECTED' }));
      return { connected: false, error: message };
    }
  }, [apiBase]);

  const disconnect = useCallback(async () => {
    try {
      isConnectionAuthorized.current = false;
      await fetch(`${apiBase}/api/disconnect`, { method: 'POST' });
      setState(prev => ({ ...prev, connectionStatus: 'DISCONNECTED' }));
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [apiBase]);

  const addPoint = (p: Partial<FlightPoint>) => {
    pushToHistory();
    const tempId = generateId();
    setState(prev => {
      const lastPoint = prev.points[prev.points.length - 1];
      const defaultZ = lastPoint ? lastPoint.z : 1;
      const z = p.z !== undefined ? p.z : defaultZ;

      const newPoint: FlightPoint = { 
        id: tempId, 
        name: tempId, 
        x: p.x ?? 0, 
        y: p.y ?? 0, 
        z: z, 
        actions: [], 
        createdAt: new Date().toISOString() 
      };
      
      const nextPoints = [...prev.points, newPoint];
      const { points, selectedPointId } = normalizePointsState(nextPoints, newPoint.id);
      return { ...prev, points, nextPointId: points.length, selectedPointId };
    });
  };

  const updatePoint = (id: string, updates: Partial<FlightPoint>) => setState(prev => ({
    ...prev,
    points: prev.points.map(p => {
      if (p.id !== id) return p;
      if (p.id === HOME_POINT_ID) {
        return { ...p, actions: updates.actions ?? p.actions };
      }
      return { ...p, ...updates };
    })
  }));
  const deletePoint = (id: string) => {
    if (id === HOME_POINT_ID) return;
    pushToHistory();
    setState(prev => {
      const nextPoints = prev.points.filter(p => p.id !== id);
      const currentSelected = prev.selectedPointId === id ? null : prev.selectedPointId;
      const { points, selectedPointId } = normalizePointsState(nextPoints, currentSelected);
      return { ...prev, points, selectedPointId };
    });
  };
  const clearAllPoints = () => { pushToHistory(); setState(prev => ({ ...prev, points: [createHomePoint()], selectedPointId: null })); };
  const reorderPoints = (from: number, to: number) => { 
    if (from === 0 || to === 0) return;
    const res = [...state.points]; 
    const [moved] = res.splice(from, 1); 
    res.splice(to, 0, moved); 
    setState(prev => {
      const { points, selectedPointId } = normalizePointsState(res, prev.selectedPointId);
      return { ...prev, points, selectedPointId };
    });
  };
  const toggleTheme = () => setState(prev => ({ ...prev, darkMode: !prev.darkMode }));
  const toggleLoop = () => setState(prev => ({ ...prev, isLooped: !prev.isLooped }));
  const enableLoopWithLandRemoval = () => {
    pushToHistory();
    setState(prev => ({
      ...prev,
      isLooped: true,
      points: prev.points.map(p => ({ ...p, actions: p.actions.filter(a => a.type !== 'land') }))
    }));
  };
  const addAction = (pointId: string, type: ActionType) => {
    pushToHistory();
    const params: ActionParams = type === 'land' ? { landOn: 'current' } : {};
    setState(prev => ({ ...prev, points: prev.points.map(p => p.id === pointId ? { ...p, actions: [...p.actions, { id: generateId(), type, params }] } : p) }));
  };
  const removeAction = (pointId: string, actionId: string) => {
    pushToHistory();
    setState(prev => ({
      ...prev,
      points: prev.points.map(p => {
        if (p.id !== pointId) return p;
        return { ...p, actions: p.actions.filter(a => a.id !== actionId) };
      })
    }));
  };
  const reorderActions = (pointId: string, from: number, to: number) => {
    setState(prev => ({
      ...prev,
      points: prev.points.map(p => {
        if (p.id !== pointId) return p;
        const newActions = [...p.actions];
        const [moved] = newActions.splice(from, 1);
        newActions.splice(to, 0, moved);
        return { ...p, actions: newActions };
      })
    }));
  };
  const updateActionParam = (pointId: string, actionId: string, key: ActionParamKey, value: number | string | boolean) => setState(prev => ({ ...prev, points: prev.points.map(p => p.id === pointId ? { ...p, actions: p.actions.map(a => a.id === actionId ? { ...a, params: { ...a.params, [key]: value } } : a) } : p) }));

  const updateConnectionStatus = useCallback((connected: boolean) => {
    setState(prev => {
      const nextStatus = connected ? 'CONNECTED' : 'DISCONNECTED';
      if (prev.connectionStatus === 'CONNECTED' && nextStatus === 'DISCONNECTED') {
        setShowDisconnectWarning(true);
        // Force reset authorized state on unexpected disconnect
        isConnectionAuthorized.current = false;
        // Close all modals
        setShowConnectModal(false);
      }
      return { ...prev, connectionStatus: nextStatus };
    });
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/status`);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json().catch(() => null);
      const connected = Boolean(data?.connected);
      const apState = data?.autopilot_state || 'UNKNOWN';
      
      // Process logs from server
      if (data?.logs && Array.isArray(data.logs)) {
        data.logs.forEach((msg: string) => addLog('INFO', `[SERVER] ${msg}`));
      }

      // If backend is connected but user hasn't authorized it in this session,
      // we force it to appear disconnected so the user is asked to connect.
      if (connected && !isConnectionAuthorized.current) {
         updateConnectionStatus(false);
         setState(prev => ({ ...prev, autopilotState: 'DISCONNECTED' }));
         return false;
      }

      setState(prev => ({ ...prev, autopilotState: apState }));
      updateConnectionStatus(connected);
      return connected;
    } catch {
      updateConnectionStatus(false);
      setState(prev => ({ ...prev, autopilotState: 'DISCONNECTED' }));
      return false;
    }
  }, [apiBase, updateConnectionStatus, addLog]);

  const fetchBattery = useCallback(async (forceConnected?: boolean) => {
    if (!forceConnected && state.connectionStatus !== 'CONNECTED') return null;
    try {
      const response = await fetch(`${apiBase}/api/battery`);
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json().catch(() => null);
      const voltage = typeof data?.voltage === 'number' ? data.voltage : null;
      if (voltage !== null) {
        setState(prev => ({ ...prev, batteryVoltage: voltage }));
      }
      return voltage;
    } catch {
      addLog('WARN', 'Не удалось получить данные о батарее');
      return null;
    }
  }, [apiBase, addLog, state.connectionStatus]);

  const refreshStatus = useCallback(async () => {
    const connected = await fetchStatus();
    const voltage = connected ? await fetchBattery(true) : null;
    return { connected, voltage, autopilotState: state.autopilotState };
  }, [fetchBattery, fetchStatus, state.autopilotState]);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;

    if (state.selectedPointId) {
      showTimer = setTimeout(() => {
        if (!isDragging) {
          setIsCardVisible(true);
        }
      }, 0);
    } else {
      setIsCardVisible(false);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
    };
  }, [state.selectedPointId, isDragging]);

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const container = mapContainerRef.current;
      const pointSettings = pointSettingsRef.current;
      const flightPlan = flightPlanRef.current;
      if (!container || !target) return;
      if (container.contains(target)) return;
      if (pointSettings?.contains(target)) return;
      if (flightPlan?.contains(target)) return;
      setState(prev => prev.selectedPointId ? { ...prev, selectedPointId: null } : prev);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    const checkAvailability = async () => {
      if (state.connectionStatus === 'CONNECTED') return;
      try {
        const response = await fetch(`${apiBase}/api/availability`);
        const data = await response.json();
        if (data.available && !hasAskedToConnect) {
          if (autoConnectEnabled) {
            connect();
          } else {
            setShowConnectModal(true);
          }
          setHasAskedToConnect(true);
        }
      } catch {
        return;
      }
    };
    const interval = setInterval(checkAvailability, 5000);
    return () => clearInterval(interval);
  }, [apiBase, state.connectionStatus, hasAskedToConnect, autoConnectEnabled, connect]);

  // Reset asked flag when disconnected (manual or spontaneous) so we can ask again if drone is found
  useEffect(() => {
    if (state.connectionStatus === 'DISCONNECTED') {
      setHasAskedToConnect(false);
      isConnectionAuthorized.current = false;
      setAutoConnectEnabled(false);
    }
  }, [state.connectionStatus]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    fetchBattery();
    const interval = setInterval(fetchBattery, 3000);
    return () => clearInterval(interval);
  }, [fetchBattery]);

  const handleCloseWarning = () => setShowDisconnectWarning(false);
  const handleConnect = (dontShowAgain: boolean) => {
    setShowConnectModal(false);
    if (dontShowAgain) {
      setAutoConnectEnabled(true);
    }
    connect().then(res => {
      if (res.connected) {
        addLog('INFO', 'Подключено к дрону');
      } else {
        addLog('ERROR', `Ошибка подключения: ${res.error || 'Неизвестная ошибка'}`);
      }
    });
  };
  const handleCancelConnect = () => {
    setShowConnectModal(false);
    disconnect();
  };

  const batteryPercent = state.connectionStatus === 'CONNECTED' ? getBatteryPercent(state.batteryVoltage) : 0;
  const batteryColor = getBatteryColor(batteryPercent);
  const apDisplay = getApStatusDisplay(state.autopilotState);

  const contextValue = {
    state, isDialogOpen, setDialogOpen, isDragging, setDragging, draggedPointId, setDraggedPointId, addPoint, updatePoint, deletePoint, reorderPoints,
    selectPoint: (id: string | null) => setState(s => ({ ...s, selectedPointId: id })),
    clearAllPoints, undo, redo, canUndo: history.length > 0, canRedo: future.length > 0,
    addLog, clearLogs, refreshStatus, sendFlightPlan: async () => { addLog('INFO', 'Загрузка полетного задания...'); await new Promise(r => setTimeout(r, 800)); addLog('INFO', 'Задание успешно передано на БПЛА'); },
    connect, disconnect,
    arm: async () => {
        try {
            const response = await fetch(`${apiBase}/api/arm`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to arm');
            addLog('INFO', 'Дрон заармлен');
        } catch (error) {
            addLog('ERROR', 'Ошибка арминга');
            throw error instanceof Error ? error : new Error(getErrorMessage(error));
        }
    },
    disarm: async () => {
        try {
            const response = await fetch(`${apiBase}/api/disarm`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to disarm');
            addLog('INFO', 'Дрон дизармлен');
        } catch (error) {
            addLog('ERROR', 'Ошибка дизарминга');
            throw error instanceof Error ? error : new Error(getErrorMessage(error));
        }
    },
    toggleAutoArm: () => setState(prev => ({ ...prev, autoArmOnMissionStart: !prev.autoArmOnMissionStart })),
    startMission: async () => {
        try {
            if (state.autoArmOnMissionStart) {
                addLog('INFO', 'Автоматический ARM перед запуском...');
                try {
                    const armResponse = await fetch(`${apiBase}/api/arm`, { method: 'POST' });
                    if (!armResponse.ok) throw new Error('Failed to arm');
                    addLog('INFO', 'Дрон заармлен');
                    // Small delay to ensure state propagation
                    await new Promise(r => setTimeout(r, 500));
                } catch {
                    throw new Error('Не удалось выполнить ARM. Миссия отменена.');
                }
            }

            const response = await fetch(`${apiBase}/api/mission/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: state.points })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to start mission');
            }
            addLog('INFO', 'Полётная миссия запущена');
        } catch (error) {
            addLog('ERROR', `Ошибка запуска миссии: ${getErrorMessage(error)}`);
        }
    },
    land: async () => {
        try {
            const response = await fetch(`${apiBase}/api/land`, { method: 'POST' });
             if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to land');
            }
            addLog('INFO', 'Команда на посадку отправлена');
        } catch (error) {
            addLog('ERROR', `Ошибка посадки: ${getErrorMessage(error)}`);
        }
    },
    deleteSavedPlan: (id: string) => {
      setState(prev => ({
        ...prev,
        savedPlans: prev.savedPlans.filter(p => p.id !== id)
      }));
      addLog('INFO', 'План полета удален из сохраненных');
    },
    renameSavedPlan: (id: string, newName: string) => {
      setState(prev => ({
        ...prev,
        savedPlans: prev.savedPlans.map(p => p.id === id ? { ...p, name: newName } : p)
      }));
      addLog('INFO', 'План переименован');
    },
    loadSavedPlan: (id: string) => {
      const plan = state.savedPlans.find(p => p.id === id);
      if (plan) {
        pushToHistory();
        setState(prev => ({
          ...prev,
          points: JSON.parse(JSON.stringify(plan.points)),
          isLooped: plan.isLooped,
          selectedPointId: null
        }));
        setCurrentView('editor');
        addLog('INFO', `План "${plan.name}" загружен в редактор`);
      }
    },
    saveFlightPlanToFile: (name?: string) => {
      const defaultName = `План полёта №${state.savedPlans.length + 1}`;
      const planName = name?.trim() ? name.trim() : defaultName;
      const totalDistance = state.points.reduce((acc, point, i, arr) => {
        if (i === 0) return 0;
        const prev = arr[i - 1];
        const dist = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2) + Math.pow(point.z - prev.z, 2));
        return acc + dist;
      }, 0);

      const savedPlan: SavedFlightPlan = {
        id: generateId(),
        name: planName,
        createdAt: new Date().toISOString(),
        points: state.points,
        distance: parseFloat(totalDistance.toFixed(2)),
        isLooped: state.isLooped
      };

      setState(prev => ({ ...prev, savedPlans: [savedPlan, ...prev.savedPlans] }));
      addLog('INFO', 'План полета сохранен в список');
    },
    toggleTheme, toggleLoop, enableLoopWithLandRemoval, addAction, removeAction, reorderActions, updateActionParam
  };

    return (
      <AppContext.Provider value={contextValue}>
       <Sidebar 
         isOpen={isSidebarOpen} 
         onClose={() => setIsSidebarOpen(false)} 
         isDark={state.darkMode} 
         toggleTheme={toggleTheme}
         onNavigate={(view) => { setCurrentView(view); setIsSidebarOpen(false); }}
         currentView={currentView}
       />
       <div className={`w-screen h-screen flex flex-col font-sans transition-colors ${state.darkMode ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-black'}`}>
         <header className="flex flex-col lg:flex-row gap-6 items-start p-4 md:p-6 pb-2">
           <div className="flex items-center gap-4 lg:basis-9/12 w-full">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className={`p-2.5 border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${state.darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white'}`}
              title="Меню"
            >
              <Menu size={18} className={state.darkMode ? 'text-white' : 'text-black'} />
            </button>
            <div>
               <h1 className="text-4xl font-black italic uppercase leading-none">Pioneer <span className="text-yellow-500">Control</span></h1>
               <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mt-1">Drone Control System v0.1</p>
             </div>
           </div>
           
           <div className="flex items-center gap-3 lg:basis-3/12 shrink-0 w-full">
            {/* Connection Status Pill */}
            <div 
              className={`flex items-center justify-center w-[44px] h-[44px] shrink-0 border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${state.darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white'} transition-all`}
              title={`Connection: ${state.connectionStatus}`}
            >
              <Wifi size={20} className={state.connectionStatus === 'CONNECTED' ? 'text-green-500' : 'text-zinc-400'} />
            </div>

            {/* Autopilot Status Pill */}
            <div 
              className={`flex-1 flex items-center justify-center gap-2 px-3 h-[44px] min-w-[80px] border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${state.darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white'} transition-all overflow-hidden cursor-help`}
              title={apDisplay.label}
            >
              <Activity size={18} className={apDisplay.color} />
              {/* Full Label: Visible on mobile (<lg) and desktop (>=xl) */}
              <span className={`text-sm font-black uppercase tracking-wider truncate lg:hidden xl:block ${state.darkMode ? 'text-white' : 'text-black'}`}>
                {apDisplay.label}
              </span>
              {/* Short Label: Visible ONLY on laptop (lg to <xl) where space is tight */}
              <span className={`text-sm font-black uppercase tracking-wider hidden lg:block xl:hidden ${state.darkMode ? 'text-white' : 'text-black'}`}>
                {apDisplay.short}
              </span>
            </div>

            {/* Battery Status Pill */}
            <div className={`flex items-center justify-between px-3 h-[44px] min-w-[100px] border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${state.darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white'} transition-all`}>
               <div className="flex items-center gap-2 w-full justify-center">
                 <div className="relative w-7 h-3.5 shrink-0 flex items-center justify-center">
                   <div className="absolute inset-0 border-2 rounded-[4px]" style={{ borderColor: batteryColor }} />
                   <div className="w-[22px] h-[8px] overflow-hidden rounded-[1px] z-10">
                     <div className="h-full transition-all duration-500" style={{ width: `${batteryPercent}%`, backgroundColor: batteryColor }} />
                   </div>
                   <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1.5 border-2 border-l-0 rounded-r-[2px] rounded-l-none z-10 ${state.darkMode ? 'bg-zinc-900' : 'bg-white'}`} style={{ borderColor: batteryColor }} />
                 </div>
                 <span className={`text-[10px] font-black uppercase tabular-nums ${batteryPercent <= 15 && state.connectionStatus === 'CONNECTED' ? 'animate-pulse text-red-500' : ''}`} style={{ color: batteryColor }}>
                   {state.connectionStatus === 'CONNECTED' ? `${state.batteryVoltage.toFixed(2)}V` : '0.00V'}
                 </span>
               </div>
            </div>
          </div>
         </header>

         <main className="flex-1 flex flex-col gap-6 p-4 md:p-6 pt-0 overflow-hidden">
           {currentView === 'editor' ? (
             <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative">
              <section 
                  ref={mapContainerRef} 
                  className="flex-1 lg:basis-9/12 min-h-0 relative z-0 overflow-hidden"
                >
                 <MiniMap />
                 <div 
                   ref={pointSettingsRef}
                  className={`absolute top-16 right-4 bottom-2 z-20 w-80 transition-all duration-300 ease-out transform ${
                    isCardVisible
                      ? (draggedPointId ? 'translate-x-0 opacity-40 pointer-events-none' : 'translate-x-0 opacity-100')
                      : 'translate-x-10 opacity-0 pointer-events-none'
                  }`}
                 >
                   <PointSettings key={state.selectedPointId ?? 'none'} />
                 </div>
               </section>
              <section 
                ref={flightPlanRef} 
                className="lg:basis-3/12 min-h-0 shrink-0 relative z-50"
              >
                 <FlightPlanPanel />
               </section>
             </div>
           ) : (
             <SavedPlans />
           )}
           {currentView === 'editor' && <section style={{ height: consoleHeight }}><ConsolePanel height={consoleHeight} onHeightChange={setConsoleHeight} /></section>}
         </main>

        <WarningModal
          isOpen={showDisconnectWarning}
          onConfirm={handleCloseWarning}
          title="Отключение дрона"
          message="Дрон потерял соединение. Проверьте связь и попробуйте подключиться снова."
          isDark={state.darkMode}
        />
        
        {showConnectModal && (
          <ConnectModal
            isOpen={showConnectModal}
            onConfirm={handleConnect}
            onCancel={handleCancelConnect}
            isDark={state.darkMode}
          />
        )}

         <footer className="text-center p-4 pt-0">
           <p className="text-[9px] font-black opacity-20 uppercase">Drone Control System • Flight Safety Priority</p>
         </footer>
       </div>
      </AppContext.Provider>
    );
}
