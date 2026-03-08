
import type { Kinematics, Health, StateMachine, Abilities, Attachments, Transform, Input, RendererRef, Palette, Projectile, Boss } from './game/components';
import type { Level, Platform } from './constants/levels';
export type { Level, Platform };

// Core Types
export type EntityId = number;
export interface Vec2 { x: number; y: number; }
export type Facing = 1 | -1;
export type GameStatus = 'playing' | 'victory_dance' | 'levelComplete' | 'gameOver' | 'gameComplete';

// Game State & World
export interface GameState {
  status: GameStatus;
  paused: boolean;
  playerHealth: number;
  playerMaxHealth: number;
  gemsCollected: number;
  currentLevelIndex: number;
  levelStats?: LevelStats;
}

export interface LevelStats {
    timeTaken: number;
    enemiesDefeated: number;
    gemsCollected: number;
    totalGems: number;
}

export interface GameActions {
  onStateUpdate: (newState: Partial<GameState>) => void;
  createParticleBurst: (x: number, y: number, count: number, color: string, type?: string, options?: any) => void;
  setScreenShake: (magnitude: number, duration: number) => void;
  log: (message: string) => void;
  collectGem: () => void;
  playSound: (soundId: string) => void;
}

export interface BackgroundLayer {
    sprite: string;
    scrollFactorX: number;
    scrollFactorY: number;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  vy: number;
}

export interface MilkSplat {
  x: number; y: number; life: number; maxLife: number; radius: number;
}

export interface StinkCloud {
    x: number; y: number; radius: number; life: number; maxLife: number;
}

export interface World {
  time: number;
  lastTime: number;
  dt: number;
  status: GameStatus;
  actions: GameActions;
  level: Level;
  backgroundLayers: BackgroundLayer[];
  entities: Set<EntityId>;
  playerId: EntityId;
  components: Map<string, Map<EntityId, any>>;
  camera: { x: number; y: number; shakeMagnitude: number; shakeDuration: number; };
  particles: Particle[];
  floatingTexts: FloatingText[];
  milkSplats: MilkSplat[];
  stinkClouds: StinkCloud[];
  respawnPlayer: boolean;
  gemsCollected: number;
  enemiesDefeated: number;
}

export interface InputState {
  left: boolean; right: boolean; up: boolean; down: boolean;
  jump: boolean; roll: boolean; dash: boolean; shoot: boolean; throw: boolean;
  hover: boolean; // Added for jetpack
  jumpDown: boolean; rollDown: boolean; downDown: boolean; dashDown: boolean;
  shootDown: boolean; throwDown: boolean;
}

export interface ActorPreset {
  id: string; size: Vec2; physics: Partial<Kinematics>; abilities: string[];
  painterId: string; palette: Palette; attachments?: AttachmentSpec[];
}

export interface AttachmentSpec {
  id: string; 
  type: 'chain'; 
  anchor: Vec2; 
  segments: number;
  segmentLength: number; 
  colorA: string; 
  colorB: string;
  tension?: number;
  damage?: number;
  width?: number;
}

export type ComponentName = 'transform' | 'kinematics' | 'state' | 'health' | 'abilities' | 'input' | 'renderer' | 'palette' | 'attachments' | 'projectile' | 'boss';
export type Component = Transform | Kinematics | StateMachine | Health | Abilities | Input | RendererRef | Palette | Attachments | Projectile | Boss;

export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  color: string; size: number; type: string;
}

export type VideoFilter = 'none' | 'bw' | 'gameboy' | 'sepia' | 'crt' | 'night_vision';
export type AntiAliasing = 'off' | 'fxaa' | 'msaa' | 'high'; // Mapped to 2D Context smoothing

export interface GameSettings {
    // Audio
    musicVolume: number;
    musicMuted: boolean;
    sfxVolume: number;
    sfxMuted: boolean;
    // Controls
    touchOpacity: number;
    touchEnabled: boolean;
    // Video
    resolution: '480p' | '720p' | '1080p';
    fullscreen: boolean;
    filter: VideoFilter;
    scanlines: boolean;
    antiAliasing: AntiAliasing;
}
