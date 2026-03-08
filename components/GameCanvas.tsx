
import React, { useRef, useEffect, useCallback } from 'react';
import type { GameState, World, InputState, GameSettings } from '../types';
import { createWorld, spawnActor, get } from '../game/ecs';
import { runSystems } from '../game/systems';
import type { Health, Input } from '../game/components';
import { CHARACTER_PRESETS } from '../constants/characters';
import { WORLD_LEVELS } from '../constants/levels';


interface GameCanvasProps {
  gameState: GameState;
  onStateUpdate: (newState: Partial<GameState>) => void;
  input: InputState;
  settings: GameSettings;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onStateUpdate, input, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  
  // Refs for State Synchronization to avoid restarting the loop
  const gameStateRef = useRef(gameState);
  const inputRef = useRef(input);
  const previousInputRef = useRef<InputState>({} as InputState);
  const onStateUpdateRef = useRef(onStateUpdate);

  // Keep refs updated
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { inputRef.current = input; }, [input]);
  useEffect(() => { onStateUpdateRef.current = onStateUpdate; }, [onStateUpdate]);

  const getInternalResolution = () => {
      switch (settings.resolution) {
          case '480p': return { width: 854, height: 480 };
          case '1080p': return { width: 1920, height: 1080 };
          case '720p':
          default: return { width: 1280, height: 720 };
      }
  };

  const res = getInternalResolution();

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Apply AA settings
    const smoothing = settings.antiAliasing !== 'off';
    ctx.imageSmoothingEnabled = smoothing;
    ctx.imageSmoothingQuality = settings.antiAliasing === 'high' ? 'high' : 'low';

    // Select Level
    // Use the ref for initial level to avoid re-init if prop changes slightly before mount? 
    // Actually, initGame depends on gameState.currentLevelIndex, so if level changes, we WANT to re-init.
    const currentLevel = WORLD_LEVELS[gameState.currentLevelIndex] || WORLD_LEVELS[0];

    const world = createWorld({
        onStateUpdate: (newState) => {
            onStateUpdateRef.current(newState);
        },
        level: currentLevel, 
    });
    
    // Initial camera setup based on resolution
    world.camera.x = currentLevel.playerStart.x - res.width / 2;
    world.camera.y = currentLevel.playerStart.y - res.height / 2;

    worldRef.current = world;
    
    // Spawn Player
    const characterPreset = CHARACTER_PRESETS.DIDDY || CHARACTER_PRESETS.TEDDY;
    const player = spawnActor(world, characterPreset, currentLevel.playerStart);
    world.playerId = player;

  }, [gameState.currentLevelIndex, settings.resolution, settings.antiAliasing]); // Re-init on level or res change

  useEffect(() => {
    initGame();
  }, [initGame]);

  // MAIN GAME LOOP
  // This effect has NO dependencies on changing state (gameState, input)
  // It only depends on the initialization function.
  useEffect(() => {
    let animationFrameId: number;
    let isRunning = true;

    const gameLoop = () => {
      if (!isRunning) return;
      if (!worldRef.current || !canvasRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      
      const world = worldRef.current;
      const currentRawInput = inputRef.current;
      const previousInput = previousInputRef.current;
      const currentGameState = gameStateRef.current;
      
      // Process Input (Edge Detection)
      const processedInput: InputState = { ...currentRawInput };
      processedInput.jumpDown = processedInput.jump && !previousInput.jump;
      processedInput.rollDown = processedInput.roll && !previousInput.roll;
      processedInput.downDown = processedInput.down && !previousInput.down;
      processedInput.dashDown = processedInput.dash && !previousInput.dash;
      processedInput.shootDown = processedInput.shoot && !previousInput.shoot;
      processedInput.throwDown = processedInput.throw && !previousInput.throw;

      // Update previous input for next frame
      previousInputRef.current = { ...processedInput };

      // Update World Status from React State
      world.status = currentGameState.status;
      
      // PAUSE LOGIC
      if (currentGameState.paused) {
        // Still render to show pause screen frozen state? Or just stop?
        // Let's keep loop running but skip update to allow rendering if needed
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.033, (now - (world.lastTime || now)) / 1000);
      world.lastTime = now;
      world.time += dt;
      world.dt = dt;

      // Sync Input
      const playerInput = get<Input>(world, 'input', world.playerId);
      if (playerInput) {
          Object.assign(playerInput, processedInput);
      }

      // RUN SYSTEMS
      runSystems(world, canvasRef.current, processedInput);

      // STATE SYNC (React <-> ECS)
      // Check for discrepancies and update React state only if needed
      const updates: Partial<GameState> = {};
      let hasUpdates = false;

      const playerHealth = get<Health>(world, 'health', world.playerId);
      if(playerHealth) {
          if (playerHealth.hp !== currentGameState.playerHealth) {
              updates.playerHealth = playerHealth.hp;
              hasUpdates = true;
          }
          if (playerHealth.maxHp !== currentGameState.playerMaxHealth) {
              updates.playerMaxHealth = playerHealth.maxHp;
              hasUpdates = true;
          }
      }
      
      if (world.gemsCollected !== currentGameState.gemsCollected) {
        updates.gemsCollected = world.gemsCollected;
        hasUpdates = true;
      }

      if (hasUpdates) {
          onStateUpdateRef.current(updates);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [initGame]); // Only restart loop if game is re-initialized

  return (
    <canvas 
        ref={canvasRef} 
        width={res.width} 
        height={res.height} 
        className="w-full h-full object-contain" 
        style={{
             // Ensure it renders crisply if AA is off
             imageRendering: settings.antiAliasing === 'off' ? 'pixelated' : 'auto'
        }}
    />
  );
};

export default GameCanvas;
