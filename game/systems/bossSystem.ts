
import { World } from "../../types";
import { createEntity, get, set, spawnMilkProjectile } from "../ecs";
import type { Boss, Transform, StateMachine, Kinematics, Health, RendererRef, Projectile } from "../components";

function changeBossState(b: Boss, s: StateMachine, newState: typeof b.state) {
    if (b.state === newState) return;
    b.state = newState;
    s.animTime = 0;
    // Set default timers for certain states
    if (newState === 'intro') s.timers.intro = 3.0;
    if (newState === 'pounding_anticipation') s.timers.pound_anticipation = 0.8;
    if (newState === 'pounding') s.timers.pound_duration = 1.5;
    if (newState === 'barrel_throw') s.timers.throw = 1.2;
    if (newState === 'hurt') s.timers.hurt = 1.0;
}

export function bossSystem(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    
    w.entities.forEach(e => {
        const b = get<Boss>(w, 'boss', e);
        if (!b) return;

        const t = get<Transform>(w, 'transform', e);
        const s = get<StateMachine>(w, 'state', e);
        const h = get<Health>(w, 'health', e);
        const k = get<Kinematics>(w, 'kinematics', e);

        if (!t || !s || !h || !k) return;

        // Face player always unless rolling
        if (playerT && b.state !== 'roll_charge' && b.state !== 'dying') {
            t.facing = playerT.pos.x > t.pos.x ? 1 : -1;
        }

        // --- STATE MACHINE ---
        switch (b.state) {
            case 'intro':
                if (s.timers.intro <= 0) changeBossState(b, s, 'idle');
                break;

            case 'idle':
                // Wait briefly then pick action
                if (s.animTime > 1.5) {
                    const rand = Math.random();
                    if (rand < 0.4) changeBossState(b, s, 'barrel_throw');
                    else if (rand < 0.7) changeBossState(b, s, 'pounding_anticipation');
                    else changeBossState(b, s, 'jumping');
                }
                break;

            case 'barrel_throw':
                // Frame event: Spawn barrel at specific time
                if (s.animTime > 0.8 && !s.timers.barrel_spawned) {
                    s.timers.barrel_spawned = 1; // Mark as done
                    
                    // Spawn Barrel Projectile
                    const barrelId = createEntity(w);
                    const spawnX = t.pos.x + (t.facing === 1 ? t.size.x : -40);
                    set<Transform>(w, 'transform', barrelId, { 
                        pos: { x: spawnX, y: t.pos.y + 40 }, 
                        vel: { x: t.facing * 500, y: 0 }, 
                        size: { x: 40, y: 40 }, 
                        facing: t.facing, 
                        onGround: false, onWall: 0, groundY: 0, onLadder: false, lastCheckpoint: {x:0,y:0} 
                    });
                    set<Kinematics>(w, 'kinematics', barrelId, { gravity: 2000 } as Kinematics);
                    set<Projectile>(w, 'projectile', barrelId, { owner: e, damage: 1, life: 5, type: 'barrel' });
                    set<RendererRef>(w, 'renderer', barrelId, { painterId: 'projectile:barrel' }); // We'll need a simple barrel painter or reuse zone renderer logic
                    
                    w.actions.playSound('throw');
                }
                if (s.timers.throw <= 0) changeBossState(b, s, 'idle');
                break;

            case 'pounding_anticipation':
                if (s.timers.pound_anticipation <= 0) {
                    changeBossState(b, s, 'pounding');
                    t.vel.y = -600; // Hop
                }
                break;

            case 'pounding':
                // If hits ground, shake screen and spawn debris
                if (t.onGround && t.vel.y >= 0) {
                    if (Math.floor(s.animTime * 10) % 5 === 0) {
                        w.actions.setScreenShake(5, 0.2);
                        // Spawn debris from ceiling
                        if (Math.random() > 0.5) {
                            const debrisId = createEntity(w);
                            set<Transform>(w, 'transform', debrisId, {
                                pos: { x: w.camera.x + Math.random() * 960, y: w.camera.y - 50 },
                                vel: { x: 0, y: 500 },
                                size: { x: 30, y: 30 },
                                facing: 1, onGround: false, onWall: 0, groundY: 0, onLadder: false, lastCheckpoint: {x:0,y:0}
                            });
                            set<Kinematics>(w, 'kinematics', debrisId, { gravity: 1000 } as Kinematics);
                            set<Projectile>(w, 'projectile', debrisId, { owner: e, damage: 1, life: 3, type: 'debris' });
                            set<RendererRef>(w, 'renderer', debrisId, { painterId: 'projectile:barrel' }); // reuse barrel for now
                        }
                    }
                }
                if (s.timers.pound_duration <= 0) changeBossState(b, s, 'idle');
                break;

            case 'jumping':
                if (s.animTime === 0) {
                    // Launch towards player
                    t.vel.y = -k.jumpForce * 1.2;
                    if(playerT) {
                        const dx = playerT.pos.x - t.pos.x;
                        t.vel.x = Math.min(Math.max(dx, -400), 400); // Cap horizontal leap speed
                    }
                }
                if (t.onGround && s.animTime > 0.2) {
                    w.actions.setScreenShake(10, 0.5);
                    changeBossState(b, s, 'idle');
                }
                break;

            case 'hurt':
                t.vel.x = 0;
                if (s.timers.hurt <= 0) {
                    // Enrage phase transition?
                    changeBossState(b, s, 'idle');
                }
                break;

            case 'dying':
                t.vel.x = 0;
                if (s.animTime > 3.0) {
                    w.status = 'levelComplete';
                    w.actions.onStateUpdate({ status: 'levelComplete' });
                }
                break;
        }

        // --- HEALTH CHECK ---
        if (h.hp <= 0 && b.state !== 'dying') {
            changeBossState(b, s, 'dying');
            w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y/2, 100, '#FFD700', 'burst', { sizeMultiplier: 4, velocityMultiplier: 2 });
        } else if (h.hp < h.maxHp && b.state !== 'hurt' && s.invulnFrames > 0 && b.state !== 'dying') {
            // Just got hit
            changeBossState(b, s, 'hurt');
            w.actions.playSound('bossHurt');
        }
    });
}
