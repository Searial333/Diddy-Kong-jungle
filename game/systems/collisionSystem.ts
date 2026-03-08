
import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Transform, StateMachine, Abilities, Health, Kinematics, Projectile, Input } from '../components';

function aabb(r1: any, r2: any) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export function collisionSystem(w: World) {
    w.entities.forEach(e => {
        const t = get<Transform>(w, 'transform', e);
        const s = get<StateMachine>(w, 'state', e);
        const p = get<Projectile>(w, 'projectile', e);
        
        if (!t || (s && s.state === 'dying')) return;

        const a = get<Abilities>(w, 'abilities', e);
        const k = get<Kinematics>(w, 'kinematics', e);
        const input = get<Input>(w, 'input', e);

        // Don't process normal collisions if inside a barrel
        if (s && s.state === 'in_barrel') return;

        const wasOnGround = t.onGround;
        t.onGround = false;
        t.onWall = 0;
        t.onLadder = false;
        if(a) a.context.onOnewayPlatform = false;

        // Platform Collisions
        if (p) {
            for (const plat of w.level.platforms) {
                if (aabb({ x: t.pos.x, y: t.pos.y, w: t.size.x, h: t.size.y }, { x: plat.x, y: plat.y, w: plat.w, h: plat.h })) {
                    p.life = 0;
                    const cx = t.pos.x + t.size.x / 2;
                    const cy = t.pos.y + t.size.y / 2;

                    if (p.type === 'milk') {
                        w.milkSplats.push({ x: cx, y: cy, life: 5, maxLife: 5, radius: 15 + Math.random() * 10 });
                        w.actions.createParticleBurst(cx, cy, 6, '#E1F5FE', 'burst', { sizeMultiplier: 0.8 });
                    } else if (p.type === 'peanut') {
                        // Shell fragments (Light and Dark Brown)
                        w.actions.createParticleBurst(cx, cy, 5, '#D7CCC8', 'burst', { sizeMultiplier: 0.6 });
                        w.actions.createParticleBurst(cx, cy, 3, '#8D6E63', 'burst', { sizeMultiplier: 0.4 });
                    } else if (p.type === 'barrel' || p.type === 'debris') {
                        // Wood splinters
                        w.actions.createParticleBurst(cx, cy, 8, '#8D6E63', 'burst');
                        w.actions.createParticleBurst(cx, cy, 4, '#5D4037', 'burst');
                    }
                    break;
                }
            }
        } else {
            w.level.platforms.forEach(plat => {
                const platformRect = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
                const entityRect = { x: t.pos.x, y: t.pos.y, w: t.size.x, h: t.size.y };

                // One-way logic: Pass through if going up, or if player is dropping down
                if (plat.type === 'oneway') {
                    const isPlayerDropping = (a && a.context.dropThrough > 0);
                    // AI (no abilities) will always collide with top of oneway
                    if (t.vel.y < 0 || isPlayerDropping) return;
                }

                // Vertical collision
                // Check if we are overlapping horizontally first
                if (entityRect.x + entityRect.w > platformRect.x && entityRect.x < platformRect.x + platformRect.w) {
                    // Ceiling detection (solid only)
                    if (plat.type === 'solid' && t.vel.y < 0 && entityRect.y < platformRect.y + platformRect.h && entityRect.y > platformRect.y) {
                         t.pos.y = platformRect.y + platformRect.h;
                         t.vel.y = 0;
                    }
                    
                    // Ground detection
                    // We check if the bottom of the entity was previously above the platform (or close enough)
                    // and is now below or touching it.
                    // Increased tolerance (32) to catch entities spawned slightly inside the floor.
                    const tolerance = 32; 
                    if (t.vel.y >= 0 && 
                        entityRect.y + entityRect.h >= platformRect.y && 
                        entityRect.y + entityRect.h - (t.vel.y * w.dt) - tolerance <= platformRect.y) {
                        
                        if (plat.style === 'bounce' && k) {
                            t.vel.y = -k.jumpForce * 1.8;
                            if(s) s.state = 'jumping';
                            w.actions.setScreenShake(8, 6);
                            w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 15, '#e1bee7', 'ring', { sizeMultiplier: 2 });
                            return;
                        }
                        
                        // Landing logic
                        if (!wasOnGround && k) {
                             // Only player creates landing shake/particles usually
                             if (e === w.playerId) {
                                if (t.vel.y > k.jumpForce * 1.2) w.actions.setScreenShake(5, 4);
                                if(a) { a.context.coyote = k.coyoteFrames / 60.0; a.context.jumpsLeft = k.maxJumps; a.context.airDashesLeft = 1; }
                             }
                        }
                        
                        t.pos.y = platformRect.y - entityRect.h;
                        t.vel.y = 0;
                        t.onGround = true;
                        if (plat.type === 'oneway' && a) a.context.onOnewayPlatform = true;
                    }
                }

                // Horizontal collision (Solid only)
                if (plat.type === 'solid') {
                    // Check vertical overlap (excluding the very bottom/top pixels to prevent snagging on floors)
                    if (entityRect.y + entityRect.h > platformRect.y + 4 && entityRect.y < platformRect.y + platformRect.h - 4) {
                        // Moving Right
                        if (t.vel.x > 0 && entityRect.x + entityRect.w > platformRect.x && entityRect.x < platformRect.x) {
                            t.pos.x = platformRect.x - entityRect.w;
                            t.vel.x = 0;
                            t.onWall = 1;
                        }
                        // Moving Left
                        if (t.vel.x < 0 && entityRect.x < platformRect.x + platformRect.w && entityRect.x + entityRect.w > platformRect.x + platformRect.w) {
                            t.pos.x = platformRect.x + platformRect.w;
                            t.vel.x = 0;
                            t.onWall = -1;
                        }
                    }
                }
            });
        }
        
        // Zone Collisions
        w.level.zones.forEach(z => {
             const zoneRect = { x: z.x, y: z.y, w: z.w, h: z.h };
             const entityRect = { x: t.pos.x, y: t.pos.y, w: t.size.x, h: t.size.y };
             if(aabb(entityRect, zoneRect)) {
                 if (z.type === 'hazard') {
                    const health = get<Health>(w, 'health', e);
                    if (health) health.hp = 0; // Instakill
                 }
                 
                 // GOAL Logic
                 if (z.type === 'goal' && e === w.playerId) {
                    // Start celebration sequence instead of instant win.
                    // Important: Check s.state !== 'victory' to prevent re-triggering and resetting animation/timers every frame.
                    if (w.status === 'playing' && s && s.state !== 'victory') {
                        w.status = 'victory_dance';
                        
                        // Sync with React state to ensure GameCanvas doesn't reset world.status back to 'playing'
                        w.actions.onStateUpdate({ status: 'victory_dance' });
                        
                        s.state = 'victory';
                        s.animTime = 0;
                        s.timers.victory = 4.0; // Duration of dance
                        
                        t.vel.x = 0;
                        t.vel.y = 0;
                        // Center on goal roughly
                        t.pos.x = z.x + z.w/2 - t.size.x/2;
                        w.actions.playSound('victory'); 
                    }
                 }

                 if(z.type === 'ladder' || z.type === 'vine') t.onLadder = true;

                 // WARP PIPE LOGIC
                 if (z.type === 'warp' && e === w.playerId && z.destination) {
                     // Check for center alignment approx
                     const centerDiff = Math.abs((t.pos.x + t.size.x/2) - (z.x + z.w/2));
                     if (centerDiff < 20) {
                         if (input && input.down) {
                             t.pos.x = z.destination.x;
                             t.pos.y = z.destination.y;
                             t.vel.x = 0;
                             t.vel.y = 0;
                             t.lastCheckpoint = { ...z.destination };
                             w.actions.playSound('warp');
                             w.actions.createParticleBurst(z.x + z.w/2, z.y, 20, '#00ff00', 'fountain');
                             // Snap camera
                             w.camera.x = t.pos.x - 960/2;
                             w.camera.y = t.pos.y - 540/2;
                         }
                     }
                 }

                 // BARREL CANNON CATCH LOGIC
                 if (z.type === 'barrel' && e === w.playerId && z.launchVel) {
                     if (s && s.timers.barrelCooldown > 0) return;
                     
                     // Enter Barrel
                     if (s) {
                        s.state = 'in_barrel';
                        s.timers.barrelLaunch = 0.4; // Delay before firing
                        a!.context.barrelLaunchVel = { ...z.launchVel };
                        t.vel.x = 0;
                        t.vel.y = 0;
                        // Snap to center
                        t.pos.x = z.x + z.w/2 - t.size.x/2;
                        t.pos.y = z.y + z.h/2 - t.size.y/2;
                     }
                 }
             }
        });
    });
}
