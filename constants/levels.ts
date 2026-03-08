
import type { Vec2 } from '../types';

export interface Platform {
    style: 'grass' | 'dirt' | 'wood' | 'bounce' | 'secret' | 'breakable' | 'brick' | 'turnblock';
    type: 'solid' | 'oneway';
    x: number;
    y: number;
    w: number;
    h: number;
    moving?: {
        path: Vec2[];
        speed: number;
        currentIndex?: number;
        progress?: number;
    };
    hp?: number;
    data?: any;
}

export interface Zone {
    type: 'ladder' | 'hazard' | 'checkpoint' | 'goal' | 'barrel' | 'vine' | 'warp';
    x: number; y: number; w: number; h: number;
    launchVel?: Vec2; 
    destination?: Vec2; // For warp pipes
}

export interface Collectible {
    type: 'gem'; x: number; y: number; id: string;
}

export interface EnemySpawn {
    type: 'patrol'; x: number; y: number; id: string;
}

export interface Level {
    name: string;
    playerStart: Vec2;
    platforms: Platform[];
    zones: Zone[];
    collectibles: Collectible[];
    enemies: EnemySpawn[];
    bounds: { top: number, right: number, bottom: number, left: number };
}

// --- WORLD 1: JUNGLE HIJINXS CLONE ---
// Features: Treehouse start, statue pillars, hidden cave via warp pipe
export const LEVEL_1: Level = {
    name: '1-1 Jungle Hijinxs',
    playerStart: { x: 200, y: 150 }, // Treehouse top
    bounds: { top: -1000, right: 6000, bottom: 2000, left: 0 },
    platforms: [
        // -- TREEHOUSE AREA --
        { style: 'wood', type: 'solid', x: 50, y: 300, w: 300, h: 40 }, // House Floor
        { style: 'wood', type: 'oneway', x: 150, y: 200, w: 100, h: 20 }, // Roof
        { style: 'grass', type: 'solid', x: 0, y: 500, w: 800, h: 600 }, // Starting Ground
        
        // -- THE PATH FORWARD --
        { style: 'grass', type: 'solid', x: 950, y: 550, w: 400, h: 400 },
        { style: 'grass', type: 'solid', x: 1500, y: 500, w: 600, h: 500 },
        
        // -- TIKI STATUES (Pillars) --
        { style: 'dirt', type: 'solid', x: 2200, y: 400, w: 80, h: 600 },
        { style: 'dirt', type: 'solid', x: 2400, y: 300, w: 80, h: 700 },
        { style: 'dirt', type: 'solid', x: 2600, y: 400, w: 80, h: 600 },

        // -- GAP & HIDDEN AREA ACCESS --
        { style: 'grass', type: 'solid', x: 2800, y: 550, w: 500, h: 500 },
        // A pipe visually represented by a structure (rendered in system)
        
        // -- EXIT AREA --
        { style: 'grass', type: 'solid', x: 3500, y: 500, w: 1000, h: 600 },
        
        // -- SUB AREA (Underground Cave) --
        // Located far down Y axis
        { style: 'dirt', type: 'solid', x: 2800, y: 1500, w: 800, h: 40 }, // Floor
        { style: 'dirt', type: 'solid', x: 2800, y: 1200, w: 40, h: 340 }, // Wall L
        { style: 'dirt', type: 'solid', x: 3600, y: 1200, w: 40, h: 340 }, // Wall R
        { style: 'wood', type: 'oneway', x: 2900, y: 1400, w: 100, h: 20 },
        { style: 'wood', type: 'oneway', x: 3100, y: 1300, w: 100, h: 20 },
        { style: 'wood', type: 'oneway', x: 3300, y: 1400, w: 100, h: 20 },
    ],
    zones: [
        // WARP IN: Entrance on surface (Press Down)
        // Fixed Y to 1400 to spawn safely above 1500 floor (1400 + 96 = 1496)
        { type: 'warp', x: 3000, y: 500, w: 60, h: 50, destination: { x: 2900, y: 1400 } },
        // WARP OUT: Exit pipe in cave
        // Fixed Y to 400 to spawn safely above 550 floor (400 + 96 = 496)
        { type: 'warp', x: 3500, y: 1450, w: 60, h: 50, destination: { x: 3200, y: 400 } },
        
        { type: 'goal', x: 4200, y: 200, w: 100, h: 300 },
        { type: 'hazard', x: 800, y: 900, w: 150, h: 100 }, // Pit 1
    ],
    collectibles: [
        { type: 'gem', x: 300, y: 250, id: '1-1_home' },
        { type: 'gem', x: 2440, y: 250, id: '1-1_pillar' },
        { type: 'gem', x: 3150, y: 1250, id: '1-1_secret_1' }, // In cave
        { type: 'gem', x: 3350, y: 1350, id: '1-1_secret_2' }, // In cave
    ],
    enemies: [
        { type: 'patrol', x: 600, y: 450, id: 'e1' },
        { type: 'patrol', x: 1800, y: 450, id: 'e2' },
        { type: 'patrol', x: 3800, y: 450, id: 'e3' },
    ],
};

// --- LEVEL 2: KING OF SWING ---
// Mechanics: Swinging vines, moving platforms over pits
export const LEVEL_2: Level = {
    name: '1-2 King of Swing',
    playerStart: { x: 100, y: 400 },
    bounds: { top: -200, right: 3500, bottom: 1000, left: 0 },
    platforms: [
        { style: 'grass', type: 'solid', x: 0, y: 500, w: 400, h: 500 },
        
        // Moving Platform 1
        { style: 'wood', type: 'solid', x: 500, y: 500, w: 120, h: 20, moving: { path: [{x:500, y:500}, {x:800, y:500}], speed: 100 } },
        
        { style: 'wood', type: 'solid', x: 900, y: 400, w: 100, h: 400 }, // Pillar
        
        // Moving Platform 2 (Vertical)
        { style: 'wood', type: 'solid', x: 1100, y: 400, w: 120, h: 20, moving: { path: [{x:1100, y:400}, {x:1100, y:100}], speed: 150 } },
        
        { style: 'grass', type: 'solid', x: 1300, y: 200, w: 400, h: 20 }, // Upper deck
        
        { style: 'grass', type: 'solid', x: 2500, y: 500, w: 1000, h: 500 },
    ],
    zones: [
        { type: 'vine', x: 1800, y: 0, w: 20, h: 400 },
        { type: 'vine', x: 2100, y: -50, w: 20, h: 400 },
        { type: 'vine', x: 2400, y: 0, w: 20, h: 350 },
        { type: 'hazard', x: 400, y: 800, w: 2000, h: 100 },
        { type: 'goal', x: 3300, y: 200, w: 100, h: 300 },
    ],
    collectibles: [
        { type: 'gem', x: 1160, y: 80, id: '1-2_high' },
        { type: 'gem', x: 2100, y: 350, id: '1-2_vine' },
    ],
    enemies: [
        { type: 'patrol', x: 1400, y: 150, id: 'e1-2_1' },
        { type: 'patrol', x: 3000, y: 450, id: 'e1-2_2' },
    ]
};

// --- LEVEL 3: CAVE CLIMBER ---
// Mechanics: Verticality, hidden pipe walls
export const LEVEL_3: Level = {
    name: '1-3 Cave Climber',
    playerStart: { x: 100, y: 800 },
    bounds: { top: -800, right: 1200, bottom: 1000, left: 0 },
    platforms: [
        { style: 'dirt', type: 'solid', x: 0, y: 900, w: 1200, h: 100 },
        { style: 'dirt', type: 'solid', x: 0, y: 0, w: 100, h: 900 }, // Left Wall
        { style: 'dirt', type: 'solid', x: 1100, y: 0, w: 100, h: 900 }, // Right Wall
        
        { style: 'wood', type: 'oneway', x: 200, y: 750, w: 200, h: 20 },
        { style: 'wood', type: 'oneway', x: 500, y: 600, w: 200, h: 20 },
        { style: 'wood', type: 'oneway', x: 200, y: 450, w: 200, h: 20 },
        { style: 'wood', type: 'oneway', x: 500, y: 300, w: 200, h: 20 },
        
        // Secret Room (Right side)
        { style: 'brick', type: 'solid', x: 1300, y: 400, w: 300, h: 20 },
        { style: 'brick', type: 'solid', x: 1300, y: 0, w: 20, h: 420 },
        { style: 'brick', type: 'solid', x: 1600, y: 0, w: 20, h: 420 },
    ],
    zones: [
        // Warp to 300 to clear 400 floor
        { type: 'warp', x: 800, y: 850, w: 60, h: 50, destination: { x: 1400, y: 300 } }, // To Secret
        { type: 'warp', x: 1500, y: 350, w: 60, h: 50, destination: { x: 800, y: 200 } }, // From Secret
        
        { type: 'goal', x: 500, y: 0, w: 100, h: 300 },
    ],
    collectibles: [
        { type: 'gem', x: 1450, y: 250, id: '1-3_secret' },
        { type: 'gem', x: 300, y: 400, id: '1-3_mid' },
    ],
    enemies: [
        { type: 'patrol', x: 300, y: 700, id: '1-3_e1' },
        { type: 'patrol', x: 600, y: 250, id: '1-3_e2' },
    ]
};

// --- LEVEL 4: SUNSET CANNONS ---
// Mechanics: Barrel Cannons
export const LEVEL_4: Level = {
    name: '1-4 Sunset Cannons',
    playerStart: { x: 100, y: 400 },
    bounds: { top: 0, right: 4000, bottom: 800, left: 0 },
    platforms: [
        { style: 'grass', type: 'solid', x: 0, y: 500, w: 400, h: 300 },
        // Island 1
        { style: 'grass', type: 'solid', x: 1200, y: 300, w: 200, h: 500 },
        // Island 2
        { style: 'grass', type: 'solid', x: 2200, y: 200, w: 200, h: 600 },
        // Finish
        { style: 'grass', type: 'solid', x: 3200, y: 500, w: 800, h: 300 },
    ],
    zones: [
        { type: 'hazard', x: 0, y: 750, w: 4000, h: 50 },
        // Cannon Chain
        { type: 'barrel', x: 600, y: 300, w: 80, h: 80, launchVel: { x: 1000, y: -400 } },
        { type: 'barrel', x: 1700, y: 100, w: 80, h: 80, launchVel: { x: 1000, y: 0 } },
        { type: 'barrel', x: 2800, y: 300, w: 80, h: 80, launchVel: { x: 800, y: -500 } },
        
        { type: 'goal', x: 3600, y: 200, w: 100, h: 300 },
    ],
    collectibles: [
        { type: 'gem', x: 900, y: 150, id: '1-4_air' },
        { type: 'gem', x: 2300, y: 150, id: '1-4_isl' },
    ],
    enemies: []
};

// --- LEVEL 5: BOUNCY BARRAGE ---
// Mechanics: Bounce pads everywhere
export const LEVEL_5: Level = {
    name: '1-5 Bouncy Barrage',
    playerStart: { x: 50, y: 300 },
    bounds: { top: -500, right: 3000, bottom: 800, left: 0 },
    platforms: [
        { style: 'wood', type: 'solid', x: 0, y: 400, w: 200, h: 400 },
        
        { style: 'bounce', type: 'solid', x: 300, y: 500, w: 100, h: 40 },
        { style: 'bounce', type: 'solid', x: 600, y: 400, w: 100, h: 40 },
        { style: 'bounce', type: 'solid', x: 900, y: 300, w: 100, h: 40 },
        
        { style: 'wood', type: 'solid', x: 1200, y: 200, w: 400, h: 40 },
        
        { style: 'bounce', type: 'solid', x: 1800, y: 500, w: 200, h: 40 },
        { style: 'bounce', type: 'solid', x: 2200, y: 400, w: 200, h: 40 },
        
        { style: 'grass', type: 'solid', x: 2600, y: 400, w: 400, h: 400 },
    ],
    zones: [
        { type: 'hazard', x: 0, y: 700, w: 3000, h: 100 },
        { type: 'goal', x: 2800, y: 100, w: 100, h: 300 },
    ],
    collectibles: [
        { type: 'gem', x: 650, y: 200, id: '1-5_b1' },
        { type: 'gem', x: 2300, y: 200, id: '1-5_b2' },
    ],
    enemies: [
        { type: 'patrol', x: 1400, y: 150, id: '1-5_e1' },
    ]
};

// --- LEVEL 6: FACTORY ANTECHAMBER ---
// Mechanics: Hard platforming, lots of enemies, preparation for boss
export const LEVEL_6: Level = {
    name: '1-6 Factory Antechamber',
    playerStart: { x: 100, y: 500 },
    bounds: { top: -200, right: 3000, bottom: 800, left: 0 },
    platforms: [
        { style: 'brick', type: 'solid', x: 0, y: 600, w: 600, h: 200 },
        
        // Complex jumps
        { style: 'wood', type: 'oneway', x: 700, y: 500, w: 100, h: 20 },
        { style: 'wood', type: 'oneway', x: 900, y: 400, w: 100, h: 20 },
        { style: 'wood', type: 'oneway', x: 700, y: 300, w: 100, h: 20 },
        { style: 'wood', type: 'oneway', x: 900, y: 200, w: 100, h: 20 },
        
        { style: 'brick', type: 'solid', x: 1200, y: 300, w: 400, h: 20 },
        { style: 'brick', type: 'solid', x: 1800, y: 300, w: 400, h: 20 },
        
        { style: 'brick', type: 'solid', x: 2400, y: 500, w: 600, h: 300 },
    ],
    zones: [
        { type: 'hazard', x: 600, y: 750, w: 1800, h: 50 },
        { type: 'goal', x: 2800, y: 200, w: 100, h: 300 },
    ],
    collectibles: [
        { type: 'gem', x: 800, y: 150, id: '1-6_top' },
        { type: 'gem', x: 1500, y: 200, id: '1-6_mid' },
    ],
    enemies: [
        { type: 'patrol', x: 1400, y: 250, id: '1-6_e1' },
        { type: 'patrol', x: 2000, y: 250, id: '1-6_e2' },
        { type: 'patrol', x: 2600, y: 450, id: '1-6_e3' },
    ]
};

// --- LEVEL 9: BOSS ---
export const BOSS_LEVEL: Level = {
    name: '1-BOSS Monkey Business',
    playerStart: { x: 200, y: 400 },
    bounds: { top: -200, right: 1500, bottom: 800, left: 0 },
    platforms: [
        // Main Arena Floor
        { style: 'wood', type: 'solid', x: 0, y: 500, w: 1500, h: 300 },
        // Left Wall
        { style: 'wood', type: 'solid', x: -50, y: 0, w: 50, h: 800 },
        // Right Wall
        { style: 'wood', type: 'solid', x: 1500, y: 0, w: 50, h: 800 },
        // Side Platforms
        { style: 'wood', type: 'oneway', x: 100, y: 350, w: 300, h: 20 },
        { style: 'wood', type: 'oneway', x: 1100, y: 350, w: 300, h: 20 },
        // Center Platform (High)
        { style: 'wood', type: 'oneway', x: 600, y: 200, w: 300, h: 20 },
    ],
    zones: [],
    collectibles: [],
    enemies: [], // Spawning manually in ECS for boss
};

// The World Map
export const WORLD_LEVELS = [
    LEVEL_1,
    LEVEL_2,
    LEVEL_3,
    LEVEL_4,
    LEVEL_5,
    LEVEL_6,
    BOSS_LEVEL
];

export const EMPTY_LEVEL: Level = LEVEL_1;
