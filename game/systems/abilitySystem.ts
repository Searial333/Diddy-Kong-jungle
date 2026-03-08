
import type { World, InputState } from '../../types';
import { get, spawnPeanutProjectile } from '../ecs';
import type { Abilities, Kinematics, StateMachine, Transform, Health, Palette } from '../components';

const changeState = (s: StateMachine, newState: string) => {
    if (s.state !== newState) {
        s.state = newState;
        s.animTime = 0;
        // State specific init
        if (newState === 'rollWindup') s.timers.rollWindup = 0.05;
        if (newState === 'dashing') s.timers.dashing = 0; 
        if (newState === 'jetpack') s.timers.jetpackFuel = 1.5; // Max flight time logic handled in logic
        if (newState === 'bottleShootTap') s.timers.shoot = 0.15;
    }
};

const applyMovement = (t: Transform, k: Kinematics, input: InputState, dt: number) => {
    if (t.onGround) {
        const runAccel = k.runAcceleration * dt;
        if (input.right) {
            t.vel.x = Math.min(k.runSpeed, t.vel.x + runAccel);
            t.facing = 1;
        } else if (input.left) {
            t.vel.x = Math.max(-k.runSpeed, t.vel.x - runAccel);
            t.facing = -1;
        } else {
            // Stronger friction on ground for snappy stop
            const friction = Math.pow(k.runFriction, dt * 60);
            t.vel.x *= friction;
            if (Math.abs(t.vel.x) < 10) t.vel.x = 0;
        }
    } else {
        // Air control
        if (input.right) {
            t.facing = 1;
            if (t.vel.x < k.maxAirSpeed) {
                t.vel.x += k.airAcceleration * dt;
            }
        } else if (input.left) {
            t.facing = -1;
            if (t.vel.x > -k.maxAirSpeed) {
                t.vel.x -= k.airAcceleration * dt;
            }
        } else {
            t.vel.x *= Math.pow(k.airFriction, dt * 60);
        }
    }
};

export function abilitySystem(w: World, input: InputState) {
    const e = w.playerId;
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const a = get<Abilities>(w, 'abilities', e);
    const k = get<Kinematics>(w, 'kinematics', e);
    const h = get<Health>(w, 'health', e);
    const pal = get<Palette>(w, 'palette', e);
    if (!t || !s || !a || !k || !h || !pal || h.dead) return;

    // --- VICTORY DANCE LOGIC (Automatic Control) ---
    if (s.state === 'victory') {
        t.vel.x = 0; // No horizontal movement
        
        // Sequence based on animTime
        if (s.animTime < 0.5) {
            // Wait/Prepare
        } else if (s.animTime < 0.7 && t.onGround) {
             // Hop 1
             t.vel.y = -350;
        } else if (s.animTime > 1.2 && s.animTime < 1.4 && t.onGround) {
             // Hop 2
             t.vel.y = -350;
        } else if (s.animTime > 2.0 && s.animTime < 2.2 && t.onGround) {
             // Big Jump Spin
             t.vel.y = -600;
             w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 20, '#FFD700', 'burst');
        } 
        
        // Transition to Level Complete UI after dance
        if (s.timers.victory <= 0) {
            w.status = 'levelComplete';
            w.actions.onStateUpdate({ 
                status: 'levelComplete',
                levelStats: {
                    timeTaken: w.time,
                    enemiesDefeated: w.enemiesDefeated,
                    gemsCollected: w.gemsCollected,
                    totalGems: w.level.collectibles.length + w.gemsCollected // Approximation or exact if tracked
                }
            });
        }
        return; // Skip rest of input processing
    }

    // --- SPECIAL STATES ---
    if (s.state === 'in_barrel') {
        t.vel.x = 0; t.vel.y = 0;
        if (s.timers.barrelLaunch <= 0) {
            const lvel = a.context.barrelLaunchVel;
            if (lvel) {
                t.vel.x = lvel.x; t.vel.y = lvel.y;
                w.actions.setScreenShake(15, 10);
                w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y/2, 40, '#ffd700', 'burst', { sizeMultiplier: 3, velocityMultiplier: 2 });
                s.timers.barrelCooldown = 0.6;
                changeState(s, 'jumping');
            }
        }
        return;
    }

    const isAttacking = ['bottleCharge', 'bottleShootTap', 'bottleShootBeam', 'throwingDiaper'].includes(s.state);
    const lockedStates = ['slamming', 'rolling', 'rollWindup', 'backflip', 'winded', 'dashing', 'slamLand', 'wallSliding', 'jetpack', 'hurt', 'dying'];
    const canAct = !lockedStates.includes(s.state) || isAttacking;

    // --- SHOOTING ---
    if (input.shootDown && a.available.has('bottleBlaster') && !['rolling', 'dashing', 'slamming', 'wallSliding', 'climbing', 'in_barrel', 'hurt', 'dying'].includes(s.state)) {
        changeState(s, 'bottleShootTap');
        spawnPeanutProjectile(w, e);
        // Recoil
        if (!t.onGround) {
            t.vel.x -= t.facing * 100;
        }
    }

    // --- JETPACK (Hover) ---
    if (input.hover && !t.onGround && a.available.has('jetpack') && canAct) {
        // Holding Jump while in air triggers jetpack hover
        // Only if we are falling or actively jumping and want to extend
        if (s.state !== 'jetpack') {
             changeState(s, 'jetpack');
        }
    }
    
    // --- VARIABLE JUMP HEIGHT ---
    if (!input.jump && t.vel.y < 0 && ['jumping', 'backflip', 'doubleJump'].includes(s.state)) {
        t.vel.y *= 0.5; // Cut velocity for short hops
    }

    // --- CLIMBING ---
    if (t.onLadder && !isAttacking && canAct) {
        if (input.up || input.down) {
            changeState(s, 'climbing');
        }
    }
    if (s.state === 'climbing' && !t.onLadder) changeState(s, 'falling');


    // --- JUMPING ---
    if (input.jumpDown && canAct) {
        // Wall Jump
        if (s.state === 'wallSliding' || (t.onWall !== 0 && !t.onGround && a.available.has('wallSlide'))) {
             t.vel.y = -k.wallJumpYForce;
             t.vel.x = -t.onWall * k.wallJumpXBoost;
             t.facing = t.onWall === 1 ? -1 : 1;
             t.onWall = 0;
             a.context.jumpsLeft = k.maxJumps - 1;
             changeState(s, 'jumping');
             w.actions.createParticleBurst(t.pos.x + (t.facing === 1 ? 0 : t.size.x), t.pos.y + t.size.y/2, 8, '#FFF', 'burst');
             w.actions.setScreenShake(3, 5);
        }
        // Climbing Jump
        else if (s.state === 'climbing') {
             t.vel.y = -k.jumpForce;
             t.vel.x = input.left ? -k.runSpeed : (input.right ? k.runSpeed : 0);
             changeState(s, 'jumping');
             a.context.jumpsLeft = k.maxJumps - 1;
        }
        // Ground Jump / Coyote Time
        else if (t.onGround || a.context.coyote > 0) {
            t.vel.y = -k.jumpForce;
            t.onGround = false;
            a.context.coyote = 0;
            changeState(s, 'jumping');
            a.context.jumpsLeft = k.maxJumps - 1;
            // Roll Jump (Long Jump)
            if (s.state === 'rolling') {
                t.vel.x = k.maxRollSpeed * t.facing * 0.8; // Maintain speed
            }
        }
        // Double Jump
        else if (a.context.jumpsLeft > 0 && a.available.has('doubleJump')) {
            t.vel.y = -k.jumpForce; 
            a.context.jumpsLeft--;
            changeState(s, 'backflip');
            w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y, 5, '#ffd700', 'ring');
        }
    }

    // --- DASH / ATTACK ---
    const canDash = a.available.has('dash') && (a.context.dashCooldown ?? 0) <= 0;
    if (input.dashDown && canDash && canAct) {
        const canAirDash = !t.onGround && (a.context.airDashesLeft ?? 0) > 0;
        if(t.onGround || canAirDash) {
            changeState(s, 'dashing');
            s.timers.dashing = k.dashDuration;
            a.context.dashCooldown = k.dashCooldown;
            t.vel.y = 0; // defy gravity momentarily
            t.vel.x = k.dashSpeed * t.facing;

            if (!t.onGround) {
                a.context.airDashesLeft = (a.context.airDashesLeft ?? 1) - 1;
            }
            w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y / 2, 10, pal.bandana_highlight || '#FFF', 'line', { direction: t.facing });
        }
    }

    // --- SLAM ---
    if (input.downDown && !t.onGround && a.available.has('slam') && canAct) {
        changeState(s, 'slamming');
        s.timers.slamWindup = 0.15;
        t.vel.x = 0;
        t.vel.y = 0; // Pause in air
    }
    
    // --- ROLL ---
    if (input.rollDown && t.onGround && a.available.has('roll') && canAct) {
        changeState(s, 'rollWindup');
    }
    
    // --- WALL SLIDE ENTRY ---
    if (!t.onGround && t.onWall !== 0 && t.vel.y > 0 && a.available.has('wallSlide') && s.state !== 'climbing' && canAct) {
         // Push into wall to slide
         if ((t.onWall === 1 && input.right) || (t.onWall === -1 && input.left)) {
             changeState(s, 'wallSliding');
         }
    }


    // --- STATE UPDATE LOOP ---
    switch (s.state) {
        case 'idle':
        case 'running':
            applyMovement(t, k, input, w.dt);
            if (Math.abs(t.vel.x) > 10) changeState(s, 'running');
            else changeState(s, 'idle');
            
            if (!t.onGround && !t.onLadder) changeState(s, 'falling');
            break;

        case 'hurt':
            // Can't move while hurt. Friction applies.
            t.vel.x *= Math.pow(0.9, w.dt * 60);
            if (s.timers.hurt <= 0) {
                 changeState(s, t.onGround ? 'idle' : 'falling');
            }
            break;
        
        case 'dying':
            // No control, horizontal friction in air
            t.vel.x *= Math.pow(0.95, w.dt * 60);
            break;

        case 'bottleShootTap':
            // Allow movement while shooting (run and gun)
            applyMovement(t, k, input, w.dt);
            if (s.timers.shoot <= 0) {
                changeState(s, t.onGround ? (Math.abs(t.vel.x) > 10 ? 'running' : 'idle') : 'falling');
            }
            break;

        case 'jetpack':
            // Jetpack Physics: Counter gravity + upward thrust
            const thrust = k.gravity + 400; // Hover + a bit of lift
            t.vel.y -= thrust * w.dt;
            // Cap upward velocity so we don't rocket away
            t.vel.y = Math.max(-300, t.vel.y); 
            
            applyMovement(t, k, input, w.dt);
            
            // Exit conditions
            if (!input.hover || t.onGround) {
                changeState(s, 'falling');
            }
            
            // Particles
            if (Math.random() < 0.3) {
                w.actions.createParticleBurst(t.pos.x + (t.facing > 0 ? -10 : t.size.x + 10), t.pos.y + t.size.y - 10, 2, '#FFA000', 'burst');
            }
            break;

        case 'climbing':
            t.vel.x = 0;
            t.vel.y = 0;
            if(input.up) t.vel.y = -k.runSpeed * 0.7;
            if(input.down) t.vel.y = k.runSpeed * 0.7;
            if(input.left) t.pos.x -= 2; // Adjust position slightly
            if(input.right) t.pos.x += 2;
            break;

        case 'jumping':
        case 'falling':
        case 'backflip':
             applyMovement(t, k, input, w.dt);
            if (s.state === 'backflip' && s.animTime > 0.6) changeState(s, 'falling');
            else if (s.state !== 'backflip' && t.vel.y > 0 && s.state !== 'falling') changeState(s, 'falling');
            
            if (t.onGround) {
                // Skidding land?
                if (Math.abs(t.vel.x) > k.runSpeed * 0.5) w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 3, '#D7CCC8', 'burst');
                changeState(s, 'idle');
            }
            break;

        case 'wallSliding':
            t.vel.y = Math.min(t.vel.y, k.wallSlideSpeed); // Cap slide speed
            t.facing = t.onWall === 1 ? -1 : 1; // Look away from wall? Or look at it? Let's look AT wall for slide.
            if (t.onWall === 1) t.facing = 1;
            else t.facing = -1;
            
            // Drop off
            if ((t.onWall === 1 && input.left) || (t.onWall === -1 && input.right)) {
                 t.vel.x = (t.onWall === 1 ? -1 : 1) * 100;
                 changeState(s, 'falling');
            }
            if (t.onGround) changeState(s, 'idle');
            if (t.onWall === 0) changeState(s, 'falling');
            break;

        case 'dashing':
             // Straight horizontal dash
            t.vel.y = 0;
            t.vel.x = k.dashSpeed * t.facing;
            if (s.timers.dashing <= 0) changeState(s, t.onGround ? 'idle' : 'falling');
            break;

        case 'rollWindup':
            t.vel.x = 0;
            if (s.timers.rollWindup <= 0) {
                changeState(s, 'rolling');
                t.vel.x = k.maxRollSpeed * t.facing;
                s.timers.rolling = 0.6; // Max roll time
                w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 5, '#FFF', 'burst');
            }
            break;

        case 'rolling':
            // Deceleration
            t.vel.x *= Math.pow(0.96, w.dt * 60); 
            // Gravity applies in physics system
            
            if (t.onWall !== 0) {
                // Bounce off wall
                t.vel.x = -t.vel.x * 0.5;
                t.facing *= -1;
                changeState(s, 'falling');
                w.actions.setScreenShake(5, 5);
            }
            
            if (Math.abs(t.vel.x) < k.rollMinSpeed || s.timers.rolling <= 0) {
                if(t.onGround) changeState(s, 'idle');
                else changeState(s, 'falling');
            }
            break;

        case 'slamming':
            if (s.timers.slamWindup <= 0) {
                t.vel.x = 0;
                t.vel.y = 1500; // Fast fall
            }
            if (t.onGround) {
                changeState(s, 'slamLand');
                s.timers.slamLand = 0.25;
                w.actions.setScreenShake(12, 6);
                w.actions.createParticleBurst(t.pos.x + t.size.x/2, t.pos.y + t.size.y, 20, '#D7CCC8', 'burst', { velocityMultiplier: 2 });
            }
            break;

        case 'slamLand':
            t.vel.x = 0;
            if (s.timers.slamLand <= 0) changeState(s, 'idle');
            break;
    }
}
