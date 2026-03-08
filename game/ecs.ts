
import type { World, EntityId, ComponentName, Component, Vec2, GameActions, Level, Particle } from '../types';
import type { ActorPreset } from '../types';
import { CHARACTER_PRESETS } from '../constants/characters';
import { BOSS_LEVEL } from '../constants/levels';
import type { Kinematics, Health, StateMachine, Abilities, Transform, RendererRef, Palette, Attachments, Projectile, Input, Boss } from './components';

export function createWorld(actions: Omit<GameActions, 'createParticleBurst' | 'setScreenShake' | 'log' | 'collectGem' | 'playSound'> & { level: Level }): World {
    const world: Partial<World> = {
        time: 0,
        lastTime: 0,
        dt: 1 / 60,
        status: 'playing',
        entities: new Set(),
        playerId: -1,
        components: new Map(),
        camera: { x: 0, y: 0, shakeMagnitude: 0, shakeDuration: 0 },
        particles: [],
        floatingTexts: [],
        milkSplats: [],
        stinkClouds: [],
        respawnPlayer: false,
        gemsCollected: 0,
        enemiesDefeated: 0,
        level: actions.level,
        backgroundLayers: [
            { sprite: 'sky', scrollFactorX: 0, scrollFactorY: 0 }, 
            { sprite: 'ruins', scrollFactorX: 0.05, scrollFactorY: 0.02 }, 
            { sprite: 'trees', scrollFactorX: 0.2, scrollFactorY: 0.1 }, 
            { sprite: 'canopy', scrollFactorX: 0.4, scrollFactorY: 0.2 }, 
            { sprite: 'fog', scrollFactorX: 0.5, scrollFactorY: 0.3 }, 
        ],
    };

    world.actions = {
        ...actions,
        createParticleBurst: (x, y, count, color, type = 'burst', options = {}) => {
            for (let i = 0; i < count; i++) {
                let angle = Math.random() * Math.PI * 2;
                let speed = Math.random() * 5 + 2;
                if (type === 'line' && options.direction) {
                    angle = (options.direction > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
                    speed = Math.random() * 8 + 4;
                }
                if (type === 'trail') { angle = Math.random() * Math.PI * 2; speed = Math.random() * 1; }
                if (type === 'fountain') { angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8; speed = Math.random() * 8 + 4; }
                if (options.velocityMultiplier) speed *= options.velocityMultiplier;

                (world.particles as Particle[]).push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1, maxLife: 1,
                    color, size: (Math.random() * 3 + 2) * (options.sizeMultiplier ?? 1), type,
                });
            }
        },
        setScreenShake: (magnitude, duration) => {
            (world.camera as World['camera']).shakeMagnitude = magnitude;
            (world.camera as World['camera']).shakeDuration = duration;
        },
        log: (message: string) => {},
        collectGem: () => {
            (world as World).gemsCollected += 1;
            const h = get<Health>(world as World, 'health', (world as World).playerId);
            if (h && h.hp < h.maxHp) {
                h.hp += 1;
            }
        },
        playSound: (soundId: string) => {
            // Mock sound engine
        }
    };

    // SPAWN BOSS if Boss Level
    if (actions.level.name.includes('BOSS')) {
        spawnBoss(world as World, { x: 1000, y: 200 });
    }

    return world as World;
}

let nextEntityId = 0;
export function createEntity(w: World): EntityId {
    const id = nextEntityId++;
    w.entities.add(id);
    return id;
}

export function set<T extends Component>(w: World, name: ComponentName, e: EntityId, c: T) {
    if (!w.components.has(name)) w.components.set(name, new Map());
    w.components.get(name)!.set(e, c);
}

export function get<T extends Component>(w: World, name: ComponentName, e: EntityId): T | undefined {
    return w.components.get(name)?.get(e) as T | undefined;
}

export function spawnActor(w: World, preset: ActorPreset, pos: Vec2): EntityId {
    const e = createEntity(w);
    set<Transform>(w, 'transform', e, {
        pos: { ...pos }, vel: { x: 0, y: 0 }, size: preset.size,
        facing: 1, onGround: false, onWall: 0, groundY: -1, onLadder: false,
        lastCheckpoint: {...pos}
    });
    const defaultPhysics = CHARACTER_PRESETS.TEDDY.physics;
    set<Kinematics>(w, 'kinematics', e, { ...defaultPhysics, ...preset.physics } as Kinematics);
    set<StateMachine>(w, 'state', e, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {} });
    set<Health>(w, 'health', e, { hp: 3, maxHp: 3, dead: false });
    const maxJumps = get<Kinematics>(w, 'kinematics', e)?.maxJumps ?? 2;
    set<Abilities>(w, 'abilities', e, {
        available: new Set(preset.abilities),
        context: { jumpsLeft: maxJumps, coyote: 0, rollMomentum: 0, dropThrough: 0, airDashesLeft: 1, hasDiaper: true, lookTarget: null }
    });
    set<RendererRef>(w, 'renderer', e, { painterId: preset.painterId });
    set<Palette>(w, 'palette', e, preset.palette);
    set<Input>(w, 'input', e, { 
        left: false, right: false, up: false, down: false, 
        jump: false, roll: false, jumpDown: false, rollDown: false, downDown: false 
    });
    if (preset.attachments) set<Attachments>(w, 'attachments', e, { list: preset.attachments });
    return e;
}

export function spawnMilkProjectile(w: World, owner: EntityId) {
    const t = get<Transform>(w, 'transform', owner);
    if (!t) return;
    const e = createEntity(w);
    const size = { x: 16, y: 16 };
    const pos = { 
        x: t.pos.x + (t.facing > 0 ? t.size.x : -size.x), 
        y: t.pos.y + t.size.y / 2 - size.y / 2
    };
    set<Transform>(w, 'transform', e, {
        pos,
        vel: { x: t.facing * 800, y: 0 },
        size,
        facing: t.facing,
        onGround: false,
        onWall: 0,
        groundY: -1,
        onLadder: false,
        lastCheckpoint: { ...pos }
    });
    set<Kinematics>(w, 'kinematics', e, { gravity: 0 } as Kinematics);
    set<Projectile>(w, 'projectile', e, { owner, damage: 1, life: 2, type: 'milk' });
    set<Health>(w, 'health', e, { hp: 1, maxHp: 1, dead: false });
    set<RendererRef>(w, 'renderer', e, { painterId: 'projectile:milk' });
    set<StateMachine>(w, 'state', e, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {} });
    return e;
}

export function spawnDiaperBombProjectile(w: World, owner: EntityId) {
    const t = get<Transform>(w, 'transform', owner);
    if (!t) return;
    const e = createEntity(w);
    const size = { x: 20, y: 20 };
    const pos = { 
        x: t.pos.x + (t.facing > 0 ? t.size.x : -size.x), 
        y: t.pos.y + t.size.y / 4 
    };
    set<Transform>(w, 'transform', e, {
        pos,
        vel: { x: t.facing * 400, y: -400 },
        size,
        facing: t.facing,
        onGround: false,
        onWall: 0,
        groundY: -1,
        onLadder: false,
        lastCheckpoint: { ...pos }
    });
    set<Kinematics>(w, 'kinematics', e, { gravity: 1200 } as Kinematics);
    set<Projectile>(w, 'projectile', e, { owner, damage: 2, life: 3, type: 'diaperBomb' });
    set<Health>(w, 'health', e, { hp: 1, maxHp: 1, dead: false });
    set<RendererRef>(w, 'renderer', e, { painterId: 'projectile:diaperBomb' });
    set<StateMachine>(w, 'state', e, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {} });
    return e;
}

const DEFAULT_PROJECTILE_PHYSICS: Kinematics = {
    gravity: 0, runSpeed: 0, runAcceleration: 0, runFriction: 0,
    maxRollSpeed: 0, rollSpeedBoost: 0, rollDeceleration: 0, rollMinSpeed: 0,
    wallSlideSpeed: 0, jumpForce: 0, wallJumpXBoost: 0, wallJumpYForce: 0,
    airAcceleration: 0, airFriction: 0, maxAirSpeed: 0, coyoteFrames: 0,
    maxJumps: 0, dashSpeed: 0, dashDuration: 0, dashCooldown: 0,
    bottleChargeTime: 0, bottleLaserDuration: 0
};

export function spawnPeanutProjectile(w: World, owner: EntityId) {
    const t = get<Transform>(w, 'transform', owner);
    if (!t) return;
    const e = createEntity(w);
    const size = { x: 12, y: 8 };
    
    // Gun Alignment Configuration
    // Offset inside the bounding box (deep enough so initial velocity doesn't create a gap)
    const gunOffsetX = 40; 
    
    // Vertical alignment relative to center
    // Ground: Gun is held at chest level. 
    // Air: Gun is tilted up (-10deg) + Body tilt. Needs to be higher.
    const heightOffset = t.onGround ? -2 : -10;
    
    const spawnX = t.facing > 0 
        ? t.pos.x + gunOffsetX 
        : t.pos.x + t.size.x - gunOffsetX - size.x;
    
    const spawnY = t.pos.y + t.size.y / 2 + heightOffset;

    // Velocity Calculation
    // In air, we angle the shot slightly up to match the gun model's tilt
    const speed = 900;
    const vy = t.onGround ? 0 : -200; 

    set<Transform>(w, 'transform', e, {
        pos: { x: spawnX, y: spawnY },
        vel: { x: t.facing * speed, y: vy },
        size,
        facing: t.facing,
        onGround: false,
        onWall: 0,
        groundY: -1,
        onLadder: false,
        lastCheckpoint: { x: spawnX, y: spawnY }
    });
    
    // Provide full kinematics object to avoid NaNs in systems
    set<Kinematics>(w, 'kinematics', e, { ...DEFAULT_PROJECTILE_PHYSICS, gravity: 500 });
    
    set<Projectile>(w, 'projectile', e, { owner, damage: 1, life: 2, type: 'peanut' });
    set<Health>(w, 'health', e, { hp: 1, maxHp: 1, dead: false });
    set<RendererRef>(w, 'renderer', e, { painterId: 'projectile:peanut' });
    set<StateMachine>(w, 'state', e, { state: 'idle', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {} });
    
    // Visual FX - Muzzle flash at the VISUAL BARREL TIP
    const barrelTipOffset = 88; // Distance from entity edge to gun tip
    const burstX = t.facing > 0 
        ? t.pos.x + barrelTipOffset 
        : t.pos.x + t.size.x - barrelTipOffset;
    
    // Adjust burst Y for air shot
    const burstY = spawnY + size.y/2 + (t.onGround ? 0 : -4);

    w.actions.createParticleBurst(burstX, burstY, 5, '#FFF', 'burst');
    
    return e;
}

export function spawnBoss(w: World, pos: Vec2) {
    const e = createEntity(w);
    set<Transform>(w, 'transform', e, {
        pos: { ...pos }, vel: { x: 0, y: 0 }, size: { x: 160, y: 160 },
        facing: -1, onGround: false, onWall: 0, groundY: 0, onLadder: false, lastCheckpoint: {...pos}
    });
    set<Health>(w, 'health', e, { hp: 10, maxHp: 10, dead: false });
    set<StateMachine>(w, 'state', e, { 
        state: 'intro', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: { intro: 3.0 }, enemyId: 'boss_dk' 
    });
    set<Boss>(w, 'boss', e, { state: 'intro', phase: 1 });
    
    // Heavy Physics for Big Ape
    set<Kinematics>(w, 'kinematics', e, { 
        gravity: 2500, jumpForce: 1000, 
        // Zero out unused stats
        runSpeed: 0, runAcceleration: 0, runFriction: 0, maxRollSpeed: 0, rollSpeedBoost: 0, rollDeceleration: 0, rollMinSpeed: 0, wallSlideSpeed: 0, wallJumpXBoost: 0, wallJumpYForce: 0, airAcceleration: 0, airFriction: 0, maxAirSpeed: 0, coyoteFrames: 0, maxJumps: 0, dashSpeed: 0, dashDuration: 0, dashCooldown: 0, bottleChargeTime: 0, bottleLaserDuration: 0
    });
    
    set<RendererRef>(w, 'renderer', e, { painterId: 'boss:dk' });
    set<Palette>(w, 'palette', e, {
        fur_dark: '#3f2212', fur_shadow: '#281209',
        skin: '#f5d0a9', skin_shadow: '#d4a574',
        tie: '#dc2626', tie_shadow: '#991b1b',
        eye_white: '#ffffff', eye_pupil: '#000000',
        mouth_dark: '#381815', tooth: '#fffae5'
    });
    return e;
}
