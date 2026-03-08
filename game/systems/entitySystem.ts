
import { World } from "../../types";
import { createEntity, get, set } from "../ecs";
import type { Transform, Health, StateMachine, Kinematics, RendererRef } from "../components";

export const activeCollectibles = new Set<string>();
const activeEnemies = new Set<string>();

const ENEMY_PRESET = {
    physics: {
        gravity: 2000,
        runSpeed: 80,
        runAcceleration: 500,
        runFriction: 0.9,
        maxRollSpeed: 0,
        rollSpeedBoost: 0,
        wallSlideSpeed: 0,
        jumpForce: 600,
        wallJumpXBoost: 0,
        wallJumpYForce: 0,
        airAcceleration: 200,
        airFriction: 0.95,
        maxAirSpeed: 150,
        coyoteFrames: 0,
        maxJumps: 0,
    }
}

export function entitySystem(w: World) {
    // Reset state on new level
    if ((w as any)._levelInitialized !== w.level.name) {
        activeCollectibles.clear();
        activeEnemies.clear();
        w.level.collectibles.forEach(c => activeCollectibles.add(c.id));
        w.level.enemies.forEach(e => activeEnemies.add(e.id));
        (w as any)._levelInitialized = w.level.name;
    }

    // Spawn new enemies
    w.level.enemies.forEach(e => {
        if (activeEnemies.has(e.id) && ![...w.entities].some(eid => (get<StateMachine>(w, 'state', eid))?.enemyId === e.id)) {
            const enemyId = createEntity(w);
            
            const isKremling = Math.random() > 0.3; 
            const painterId = isKremling ? 'enemy:patrol' : 'enemy:klaptrap';
            
            // Exact hitbox sizes based on painter pixel counts (units * 4)
            // Kremling: ~28 units tall = 112px. Width ~20 units = 80px.
            // Klaptrap: ~15 units tall = 60px. Width ~15 units = 60px.
            const size = isKremling ? { x: 80, y: 112 } : { x: 60, y: 60 }; 
            
            // Spawn higher to prevent spawning inside floor due to larger sizes
            const spawnY = e.y - 120;

            set<Transform>(w, 'transform', enemyId, { pos: { x: e.x, y: spawnY }, vel: { x: 0, y: 0 }, size, facing: -1, onGround: false, onWall: 0, groundY: -1, onLadder: false, lastCheckpoint: {x:0, y:0} });
            set<Health>(w, 'health', enemyId, { hp: isKremling ? 2 : 1, maxHp: isKremling ? 2 : 1, dead: false });
            set<StateMachine>(w, 'state', enemyId, { state: 'patrol', animTime: 0, invulnFrames: 0, respawnFrames: 0, timers: {}, enemyId: e.id });
            set<Kinematics>(w, 'kinematics', enemyId, { ...ENEMY_PRESET.physics } as Kinematics);
            set<RendererRef>(w, 'renderer', enemyId, { painterId });
        }
    });

    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerS = get<StateMachine>(w, 'state', w.playerId);

    // Update enemies
    w.entities.forEach(e => {
        const s = get<StateMachine>(w, 'state', e);
        if (!s || !s.enemyId) return; 

        const t = get<Transform>(w, 'transform', e);
        const h = get<Health>(w, 'health', e);
        const k = get<Kinematics>(w, 'kinematics', e);

        if (!t || !h || !k) return;

        if (h.dead) {
            t.vel.x = 0;
            return;
        }

        if (s.state === 'stunned') {
            t.vel.x = 0;
            return;
        }

        // --- AI SENSORS ---
        const footX = t.pos.x + t.size.x / 2;
        const footY = t.pos.y + t.size.y + 1;
        const lookAheadDist = t.size.x / 2 + 10;
        const probeX = footX + (t.facing * lookAheadDist);
        
        // Ground Detection Ahead (Ledge Check)
        let groundAhead = false;
        for (const p of w.level.platforms) {
            if (probeX >= p.x && probeX <= p.x + p.w && 
                footY >= p.y && footY <= p.y + p.h + 20) { // Tolerance for slopes/alignment
                groundAhead = true;
                break;
            }
        }

        // Wall Detection Ahead
        const wallProbeX = t.pos.x + t.size.x/2 + (t.facing * (t.size.x/2 + 5));
        const wallProbeY = t.pos.y + t.size.y / 2;
        let wallAhead = false;
        for (const p of w.level.platforms) {
            if (p.type === 'solid' && 
                wallProbeX >= p.x && wallProbeX <= p.x + p.w &&
                wallProbeY >= p.y && wallProbeY <= p.y + p.h) {
                wallAhead = true;
                break;
            }
        }

        // --- STATE TRANSITIONS ---
        
        // Trigger Chase
        if (playerT && playerS?.state !== 'dying' && s.state !== 'chase') {
            const dist = Math.hypot(playerT.pos.x - t.pos.x, playerT.pos.y - t.pos.y);
            const isFacingPlayer = (playerT.pos.x - t.pos.x) * t.facing > 0;
            
            // Chase if close and facing, or very close
            if ((dist < 300 && isFacingPlayer) || dist < 100) {
                s.state = 'chase';
                // Hop when noticing player
                if (t.onGround) t.vel.y = -200;
                w.floatingTexts.push({ text: '!', x: t.pos.x + t.size.x/2, y: t.pos.y, life: 0.5, maxLife: 0.5, color: '#F44336', vy: -50 });
            }
        } else if (s.state === 'chase') {
            const dist = playerT ? Math.hypot(playerT.pos.x - t.pos.x, playerT.pos.y - t.pos.y) : Infinity;
            if (dist > 600 || !playerT || playerS?.state === 'dying') {
                s.state = 'patrol';
            }
        }

        // --- BEHAVIOR ---

        if (s.state === 'chase' && playerT) {
            // Face Player
            if (Math.abs(playerT.pos.x - t.pos.x) > 10) {
                t.facing = playerT.pos.x > t.pos.x ? 1 : -1;
            }
            
            // Move
            const speed = k.runSpeed * 1.5;
            t.vel.x = speed * t.facing;

            // Jump Logic
            if (t.onGround) {
                const isPlayerAbove = playerT.pos.y < t.pos.y - 50;
                const isGap = !groundAhead;
                const isWall = wallAhead;
                
                if (isPlayerAbove && Math.abs(playerT.pos.x - t.pos.x) < 150) {
                    // Jump to reach player
                    t.vel.y = -k.jumpForce;
                } else if (isWall || isGap) {
                    // Jump obstacle
                    t.vel.y = -k.jumpForce;
                }
            }
        } 
        else { // Patrol
            // Turn around at obstacles
            if (t.onGround) {
                if (wallAhead || !groundAhead) {
                    t.facing *= -1;
                    t.vel.x = 0; // Stop momentarily
                } else {
                    t.vel.x = k.runSpeed * t.facing;
                }
            } else {
                // Air control (minimal)
                t.vel.x = k.runSpeed * 0.5 * t.facing;
            }
        }
    });

     // Check for collected items
     if (playerT) {
        w.level.collectibles.forEach(c => {
            if (!activeCollectibles.has(c.id)) return;
            const dist = Math.hypot((c.x + 12) - (playerT.pos.x + playerT.size.x/2), (c.y + 12) - (playerT.pos.y + playerT.size.y/2));
            if (dist < 40) {
                activeCollectibles.delete(c.id);
                w.actions.collectGem();
                w.actions.createParticleBurst(c.x + 12, c.y + 12, 15, '#FFD700', 'burst', { sizeMultiplier: 1.5 });
            }
        });
     }
}
