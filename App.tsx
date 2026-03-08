
import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import type { GameStatus, GameState, LevelStats, GameSettings, VideoFilter, AntiAliasing } from './types';
import { useInput } from './hooks/useInput';
import { TouchControls } from './components/TouchControls';
import { WORLD_LEVELS } from './constants/levels';

const Heart: React.FC<{ filled: boolean, isNew: boolean }> = ({ filled, isNew }) => (
  <div className={`w-9 h-9 rounded-lg border-2 border-black/40 transition-all duration-300 ${filled ? 'bg-gradient-to-br from-green-300 to-green-600 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-gradient-to-br from-red-600 to-red-900 shadow-inner'} ${isNew ? 'animate-heart-pulse' : ''}`}></div>
);

const SettingsModal: React.FC<{ 
  settings: GameSettings, 
  onUpdate: (s: GameSettings) => void, 
  onClose: () => void 
}> = ({ settings, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'controls'>('video');

  const update = (key: keyof GameSettings, value: any) => {
    onUpdate({ ...settings, [key]: value });
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch((e) => {
              console.error(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
          });
          update('fullscreen', true);
      } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
            update('fullscreen', false);
          }
      }
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
      <div className="bg-[#1a1510] border-4 border-[#5d4037] rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#2d1b18] p-4 flex justify-between items-center border-b-4 border-[#3e2723]">
          <h2 className="text-2xl font-black text-[#EBB55F] uppercase tracking-widest">Settings</h2>
          <button onClick={onClose} className="text-[#EBB55F] hover:text-white font-bold text-xl px-2">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#0f0a08]">
          {['video', 'audio', 'controls'].map(tab => (
             <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'bg-[#3e2723] text-[#ffd700]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1f1612]'}`}
             >
               {tab}
             </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'audio' && (
            <div className="space-y-8">
              {/* Music */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[#EBB55F] font-bold uppercase tracking-wider">Music Volume</label>
                  <button 
                    onClick={() => update('musicMuted', !settings.musicMuted)}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase ${settings.musicMuted ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}
                  >
                    {settings.musicMuted ? 'Muted' : 'Active'}
                  </button>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={settings.musicVolume}
                  onChange={(e) => update('musicVolume', parseFloat(e.target.value))}
                  disabled={settings.musicMuted}
                  className="w-full accent-[#ffd700] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* SFX */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[#EBB55F] font-bold uppercase tracking-wider">SFX Volume</label>
                  <button 
                    onClick={() => update('sfxMuted', !settings.sfxMuted)}
                    className={`px-3 py-1 rounded text-xs font-bold uppercase ${settings.sfxMuted ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}
                  >
                    {settings.sfxMuted ? 'Muted' : 'Active'}
                  </button>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={settings.sfxVolume}
                  onChange={(e) => update('sfxVolume', parseFloat(e.target.value))}
                  disabled={settings.sfxMuted}
                  className="w-full accent-[#ffd700] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {activeTab === 'video' && (
             <div className="space-y-8">
               
               {/* Resolution */}
               <div>
                 <label className="text-[#EBB55F] font-bold uppercase tracking-wider block mb-4">Internal Resolution</label>
                 <div className="grid grid-cols-3 gap-4">
                   {['480p', '720p', '1080p'].map((res) => (
                      <button
                        key={res}
                        onClick={() => update('resolution', res)}
                        className={`py-3 px-2 rounded-xl border-2 font-bold text-sm transition-all ${settings.resolution === res ? 'bg-[#ffd700] border-[#b8860b] text-[#3e2723]' : 'bg-[#2d1b18] border-[#3e2723] text-gray-400 hover:border-[#ffd700]'}`}
                      >
                        {res}
                      </button>
                   ))}
                 </div>
                 <p className="text-gray-500 text-xs italic mt-2">Higher resolutions allow you to see more of the world at once.</p>
               </div>

               <div className="grid grid-cols-2 gap-6">
                   {/* Fullscreen */}
                   <button 
                      onClick={toggleFullscreen}
                      className="flex items-center justify-between bg-[#2d1b18] p-4 rounded-xl border-2 border-[#3e2723] hover:border-[#ffd700] transition-colors"
                   >
                       <span className="text-[#EBB55F] font-bold uppercase">Fullscreen</span>
                       <span className="text-2xl">{document.fullscreenElement ? '⤓' : '⤢'}</span>
                   </button>

                   {/* Scanlines */}
                   <div className="flex items-center justify-between bg-[#2d1b18] p-4 rounded-xl border-2 border-[#3e2723]">
                       <span className="text-[#EBB55F] font-bold uppercase">Scanlines</span>
                        <div className="relative inline-block w-12 align-middle select-none">
                            <input 
                                type="checkbox" 
                                checked={settings.scanlines}
                                onChange={(e) => update('scanlines', e.target.checked)}
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-[#ffd700]"
                                style={{ top: -12 }}
                            />
                            <div className={`block overflow-hidden h-6 rounded-full cursor-pointer border-2 ${settings.scanlines ? 'bg-[#b8860b] border-[#ffd700]' : 'bg-gray-700 border-gray-600'}`}></div>
                        </div>
                   </div>
               </div>

               {/* Anti-Aliasing */}
               <div>
                 <label className="text-[#EBB55F] font-bold uppercase tracking-wider block mb-2">Anti-Aliasing</label>
                 <select 
                    value={settings.antiAliasing}
                    onChange={(e) => update('antiAliasing', e.target.value)}
                    className="w-full bg-[#2d1b18] text-[#ffd700] border-2 border-[#3e2723] rounded-xl p-3 font-bold focus:border-[#ffd700] outline-none appearance-none"
                 >
                    <option value="off">Off (Pixel Perfect)</option>
                    <option value="fxaa">FXAA (Smoothed)</option>
                    <option value="msaa">MSAA (Balanced)</option>
                    <option value="high">High Quality</option>
                 </select>
               </div>

               {/* Filters */}
               <div>
                 <label className="text-[#EBB55F] font-bold uppercase tracking-wider block mb-2">Visual Filter</label>
                 <select 
                    value={settings.filter}
                    onChange={(e) => update('filter', e.target.value)}
                    className="w-full bg-[#2d1b18] text-[#ffd700] border-2 border-[#3e2723] rounded-xl p-3 font-bold focus:border-[#ffd700] outline-none appearance-none"
                 >
                    <option value="none">None (Standard)</option>
                    <option value="bw">Noir (Black & White)</option>
                    <option value="gameboy">Retro Handheld (Green)</option>
                    <option value="sepia">Vintage (Sepia)</option>
                    <option value="crt">CRT Display (Curved)</option>
                    <option value="night_vision">Night Vision</option>
                 </select>
               </div>
               
             </div>
          )}

          {activeTab === 'controls' && (
             <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-[#EBB55F] font-bold uppercase tracking-wider">Touch Controls</label>
                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input 
                          type="checkbox" 
                          id="touch-toggle" 
                          checked={settings.touchEnabled}
                          onChange={(e) => update('touchEnabled', e.target.checked)}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-full checked:border-[#ffd700]"
                          style={{ top: 0, left: 0 }}
                        />
                        <label htmlFor="touch-toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer border-2 ${settings.touchEnabled ? 'bg-[#b8860b] border-[#ffd700]' : 'bg-gray-700 border-gray-600'}`}></label>
                    </div>
                  </div>
                </div>

                <div className={`transition-opacity ${!settings.touchEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                   <div className="flex justify-between items-center mb-2">
                      <label className="text-[#EBB55F] font-bold uppercase tracking-wider">Opacity</label>
                      <span className="text-white font-mono">{(settings.touchOpacity * 100).toFixed(0)}%</span>
                   </div>
                   <input 
                      type="range" min="0.1" max="1" step="0.1" 
                      value={settings.touchOpacity}
                      onChange={(e) => update('touchOpacity', parseFloat(e.target.value))}
                      className="w-full accent-[#ffd700] h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             </div>
          )}
        </div>
        
        <div className="bg-[#2d1b18] p-4 flex justify-end">
           <button onClick={onClose} className="bg-[#3e2723] text-[#ffd700] px-6 py-2 rounded-lg font-bold border-b-4 border-[#251614] hover:bg-[#4e342e] transition-colors">
              Close
           </button>
        </div>
      </div>
    </div>
  );
};

// ... (Rest of existing components: GameOverlay, LevelSelect, StartScreen remain mostly unchanged but I will include them to ensure file integrity)

const GameOverlay: React.FC<{ 
    status: GameStatus; 
    stats?: LevelStats; 
    onAction: (action: 'retry' | 'next' | 'map' | 'quit') => void; 
    isFinal: boolean 
}> = ({ status, stats, onAction, isFinal }) => {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
      if (status === 'levelComplete' || status === 'gameComplete') {
          const t = setTimeout(() => setShowStats(true), 500);
          return () => clearTimeout(t);
      } else {
          setShowStats(false);
      }
  }, [status]);

  if (status === 'playing' || status === 'victory_dance') return null;

  const isWin = status === 'levelComplete' || status === 'gameComplete';
  
  if (isWin && showStats && stats) {
      return (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50 animate-fade-in-slow">
            <div className="bg-[#1a1510] border-4 border-[#b8860b] rounded-2xl p-12 text-center shadow-[0_0_80px_rgba(184,134,11,0.5)] max-w-2xl w-full">
                <h2 className="text-5xl font-black mb-8 text-yellow-400 uppercase tracking-widest drop-shadow-md">Level Clear!</h2>
                
                <div className="grid grid-cols-2 gap-6 mb-10 text-left">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                        <div className="text-[#EBB55F] text-xs uppercase tracking-[0.2em] mb-1">Time</div>
                        <div className="text-3xl font-mono text-white">{stats.timeTaken.toFixed(2)}s</div>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                        <div className="text-[#EBB55F] text-xs uppercase tracking-[0.2em] mb-1">Enemies Defeated</div>
                        <div className="text-3xl font-mono text-white">{stats.enemiesDefeated}</div>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 col-span-2">
                        <div className="text-[#EBB55F] text-xs uppercase tracking-[0.2em] mb-1">Gems Collected</div>
                        <div className="text-4xl font-mono text-green-400">{stats.gemsCollected} <span className="text-xl text-gray-500">/ {stats.totalGems}</span></div>
                    </div>
                </div>

                <div className="flex gap-4 justify-center">
                    <button onClick={() => onAction('map')} className="bg-[#3e2723] text-[#ffd700] px-8 py-4 text-xl font-bold rounded-xl hover:bg-[#5d4037] transition-all border-b-4 border-[#2d1b18]">
                        World Map
                    </button>
                    <button onClick={() => onAction('next')} className="bg-[#ffd700] text-[#3e2723] px-8 py-4 text-xl font-black rounded-xl hover:bg-[#ffeb3b] hover:scale-105 transition-all shadow-xl border-b-4 border-[#b8860b]">
                        {isFinal ? 'Return to Title' : 'Next Level'}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (!isWin) {
      return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in backdrop-blur-md">
          <div className="bg-[#1a1510] border-4 border-red-900 rounded-2xl p-16 text-center shadow-[0_0_80px_rgba(220,38,38,0.3)]">
            <h2 className="text-6xl font-black mb-10 tracking-tighter text-red-500" style={{ textShadow: '0 4px 0px rgba(0,0,0,0.5)' }}>MISSION FAILED</h2>
            <div className="flex gap-4 justify-center">
              <button onClick={() => onAction('retry')} className="bg-[#ffd700] text-[#3e2723] px-12 py-5 text-2xl font-black rounded-xl hover:bg-[#ffeb3b] hover:scale-105 active:scale-95 transition-all shadow-xl border-b-4 border-[#b8860b]">
                Try Again
              </button>
              <button onClick={() => onAction('quit')} className="bg-[#3e2723] text-red-400 px-12 py-5 text-2xl font-black rounded-xl hover:bg-[#4e342e] hover:text-red-300 hover:scale-105 active:scale-95 transition-all shadow-xl border-b-4 border-[#251614]">
                Give Up
              </button>
            </div>
          </div>
        </div>
      );
  }

  return null;
};

const LevelSelect: React.FC<{ onSelect: (index: number) => void, onBack: () => void }> = ({ onSelect, onBack }) => {
    return (
        <div className="absolute inset-0 bg-[#1c0f2b]/90 flex flex-col items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
            <h2 className="text-4xl font-black text-[#ffd700] mb-8 tracking-widest uppercase drop-shadow-md">Select Zone</h2>
            <div className="grid grid-cols-2 gap-4 max-w-4xl w-full px-8">
                {WORLD_LEVELS.map((level, i) => (
                    <button 
                        key={i} 
                        onClick={() => onSelect(i)}
                        className="bg-[#3e2723] border-2 border-[#b8860b] p-4 rounded-xl hover:bg-[#5d4037] hover:scale-105 transition-all text-left flex items-center gap-4 group"
                    >
                        <div className="w-12 h-12 bg-[#ffd700] rounded-full flex items-center justify-center text-[#3e2723] font-black text-xl shadow-inner group-hover:bg-white transition-colors">
                            {i + 1}
                        </div>
                        <span className="text-xl font-bold text-[#EBB55F] group-hover:text-white uppercase tracking-wider">{level.name}</span>
                    </button>
                ))}
            </div>
            <button onClick={onBack} className="mt-8 text-[#EBB55F]/60 hover:text-white text-sm font-bold uppercase tracking-[0.2em] border-b border-transparent hover:border-white transition-all">Back to Title</button>
        </div>
    );
};

const StartScreen: React.FC<{ onStart: () => void, onOpenLevelSelect: () => void }> = ({ onStart, onOpenLevelSelect }) => {
  return (
    <div className="w-screen h-screen bg-[#1c0f2b] flex flex-col items-center justify-center p-4 font-mono text-gray-200 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#261C2C] via-[#5C2A52] to-[#EBB55F] opacity-80"></div>
      <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSIyIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==')] animate-pulse"></div>

      <div className="text-center animate-fade-in relative z-10 flex flex-col items-center">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#ffd700] blur-[100px] rounded-full opacity-40"></div>
        <div className="mb-6 text-[#ffd700] font-black tracking-[0.5em] uppercase text-sm drop-shadow-md">Alpha Tactical v4.0</div>
        
        <h1 className="text-7xl sm:text-[10rem] font-black tracking-tighter text-white mb-8 leading-[0.85]" style={{ textShadow: '0 10px 0 #3e2723, 0 20px 40px rgba(0,0,0,0.5)' }}>
          JUNGLE<br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] to-[#ff6f00]">HIJINX</span>
        </h1>
        
        <p className="text-[#EBB55F] mb-12 text-xl tracking-widest font-bold max-w-lg mx-auto leading-relaxed drop-shadow-md">
          RETRO-KINETIC ACTION. <br/> LUSH ATMOSPHERICS.
        </p>
        
        <div className="flex gap-4">
            <button onClick={onStart} className="group relative bg-[#ffd700] text-[#3e2723] px-12 py-6 text-3xl font-black rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_20px_60px_rgba(255,215,0,0.3)] border-b-8 border-[#b8860b]">
                <span className="relative z-10">NEW GAME</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </button>
            <button onClick={onOpenLevelSelect} className="group relative bg-[#3e2723] text-[#ffd700] px-8 py-6 text-2xl font-bold rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl border-b-8 border-[#2d1b18]">
                <span className="relative z-10">LEVEL SELECT</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [appStatus, setAppStatus] = useState<'title' | 'levelSelect' | 'playing'>('title');
  const [gameKey, setGameKey] = useState(Date.now());
  const [gameState, setGameState] = useState<GameState>({
    status: 'playing',
    paused: false,
    playerHealth: 3,
    playerMaxHealth: 3,
    gemsCollected: 0,
    currentLevelIndex: 0,
  });
  
  // Settings State
  const [settings, setSettings] = useState<GameSettings>({
    musicVolume: 0.5,
    musicMuted: false,
    sfxVolume: 0.8,
    sfxMuted: false,
    touchOpacity: 0.6,
    touchEnabled: true,
    resolution: '720p',
    fullscreen: false,
    filter: 'none',
    scanlines: true,
    antiAliasing: 'off',
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Pause game when settings are open
  useEffect(() => {
    setGameState(prev => ({ ...prev, paused: isSettingsOpen }));
  }, [isSettingsOpen]);
  
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const input = useInput(gameContainerRef);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleStateUpdate = useCallback((newState: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...newState }));
  }, []);
  
  const handleAction = useCallback((action: 'retry' | 'next' | 'map' | 'quit') => {
    if (action === 'next') {
        const nextLevelIndex = gameState.currentLevelIndex + 1;
        if (nextLevelIndex < WORLD_LEVELS.length) {
            setGameState(prev => ({
                ...prev, status: 'playing', currentLevelIndex: nextLevelIndex,
                gemsCollected: 0 // Reset counts for new level
            }));
            setGameKey(Date.now());
        } else {
            setAppStatus('title'); // End of game
        }
    } else if (action === 'map') {
        setAppStatus('levelSelect');
    } else if (action === 'retry') {
        setGameKey(Date.now());
        setGameState(prev => ({ ...prev, status: 'playing', paused: false, playerHealth: 3, gemsCollected: 0 }));
    } else if (action === 'quit') {
        setAppStatus('title');
    }
  }, [gameState.currentLevelIndex]);
  
  const handleStartGame = useCallback(() => {
      setAppStatus('playing');
      setGameState(prev => ({ ...prev, currentLevelIndex: 0, status: 'playing', playerHealth: 3, gemsCollected: 0 }));
      setGameKey(Date.now());
  }, []);

  const handleLevelSelect = useCallback((index: number) => {
      setAppStatus('playing');
      setGameState(prev => ({ ...prev, currentLevelIndex: index, status: 'playing', playerHealth: 3, gemsCollected: 0 }));
      setGameKey(Date.now());
  }, []);

  if (appStatus === 'title') return <StartScreen onStart={handleStartGame} onOpenLevelSelect={() => setAppStatus('levelSelect')} />;
  if (appStatus === 'levelSelect') return <LevelSelect onSelect={handleLevelSelect} onBack={() => setAppStatus('title')} />;

  // Filter Styles
  const getFilterStyle = (): React.CSSProperties => {
      let filterString = '';
      if (settings.filter === 'bw') filterString += 'grayscale(100%) ';
      if (settings.filter === 'gameboy') filterString += 'sepia(100%) hue-rotate(50deg) saturate(300%) contrast(0.8) ';
      if (settings.filter === 'sepia') filterString += 'sepia(80%) contrast(1.1) ';
      if (settings.filter === 'night_vision') filterString += 'grayscale(100%) sepia(100%) hue-rotate(90deg) saturate(300%) contrast(1.2) brightness(1.2) ';
      
      const style: React.CSSProperties = {
          filter: filterString,
          imageRendering: settings.antiAliasing === 'off' ? 'pixelated' : 'auto'
      };

      if (settings.filter === 'crt') {
         // Basic curve simulation via scale/border
         style.transform = 'scale(1.02)';
      }
      return style;
  };

  return (
    <div className="w-screen h-screen bg-[#1c0f2b] flex flex-col items-center justify-center p-0 m-0 font-mono overflow-hidden">
      <div 
        ref={gameContainerRef} 
        className="relative w-full h-full bg-black overflow-hidden touch-none select-none transition-all duration-300"
      >
        <div style={getFilterStyle()} className="w-full h-full">
            <GameCanvas
              key={gameKey}
              onStateUpdate={handleStateUpdate}
              gameState={gameState}
              input={input}
              settings={settings}
            />
        </div>

        {/* Scanlines Overlay */}
        {settings.scanlines && (
            <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-60"></div>
        )}
        
        {/* CRT Vignette for extra flavor if CRT filter active */}
        {settings.filter === 'crt' && (
            <div className="absolute inset-0 pointer-events-none z-30 bg-[radial-gradient(circle,rgba(0,0,0,0)_60%,rgba(0,0,0,0.6)_100%)]"></div>
        )}

        {isTouchDevice && settings.touchEnabled && <TouchControls input={input} opacity={settings.touchOpacity} />}

        <GameOverlay 
            status={gameState.status} 
            stats={gameState.levelStats}
            onAction={handleAction} 
            isFinal={gameState.currentLevelIndex === WORLD_LEVELS.length - 1}
        />

        {/* SETTINGS GEAR */}
        {gameState.status === 'playing' && (
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="absolute top-8 left-8 z-50 bg-black/40 p-2 rounded-full border-2 border-white/10 hover:bg-[#b8860b] hover:text-[#3e2723] hover:border-[#ffd700] hover:rotate-90 transition-all text-2xl drop-shadow-lg"
          >
            ⚙️
          </button>
        )}
        
        {isSettingsOpen && <SettingsModal settings={settings} onUpdate={setSettings} onClose={() => setIsSettingsOpen(false)} />}

        {/* FADE OVERLAY */}
        <div className={`absolute inset-0 bg-black pointer-events-none transition-opacity duration-[2000ms] z-40 ${gameState.status === 'levelComplete' || gameState.status === 'gameComplete' ? 'opacity-100' : 'opacity-0'}`}></div>

        {/* TOP HUD */}
        <div className="absolute top-8 left-24 right-24 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col gap-4">
            <div className="bg-black/60 border-2 border-white/10 p-4 rounded-2xl backdrop-blur-xl flex items-center gap-4 shadow-2xl">
              <div className="flex items-center gap-3">
                {Array.from({ length: gameState.playerMaxHealth }).map((_, i) => (
                  <Heart key={i} filled={i < gameState.playerHealth} isNew={false} />
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-r from-[#ffd700] to-[#ffa000] border-2 border-[#b8860b] px-6 py-2 rounded-xl flex items-center gap-4 shadow-xl self-start transform -rotate-1">
               <div className="w-4 h-4 bg-white rotate-45"></div>
               <span className="text-3xl font-black text-[#3e2723] leading-none drop-shadow-sm">{gameState.gemsCollected}</span>
            </div>
          </div>

          <div className="bg-black/60 border-2 border-white/10 px-6 py-3 rounded-2xl backdrop-blur-xl text-[#EBB55F] font-black text-sm tracking-widest uppercase">
            {WORLD_LEVELS[gameState.currentLevelIndex]?.name || 'Unknown Zone'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
