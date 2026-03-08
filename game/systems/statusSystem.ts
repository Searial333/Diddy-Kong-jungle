import type { World, EntityId } from '../../types';
import { get, set } from '../ecs';
import type { StateMachine, Transform, Health, Abilities, Kinematics, Projectile } from '../components';

function updateEntityStatus(w: World, e: EntityId) {
    const s = get<StateMachine>(w, 'state', e);
    const h = get<Health>(w, 'health', e);
    const t = get<Transform>(w, 'transform', e);
    const a = get<Abilities>(w, 'abilities', e);
    const p = get<Projectile>(w, 'projectile', e);

    if (p && t) {
        p.life -= w.dt;
        if (p.life <= 0 && h) {
            if (p.type === 'diaperBomb') {
                w.stinkClouds.push({ x: t.pos.x + t.size.x / 2, y: t.pos.y + t.size.y / 2, radius: 150, life: 5, maxLife: 5 });
                w.actions.createParticleBurst(t.pos.x + t.size.x / 2, t.pos.y + t.size.y / 2, 50, '#9ccc65', 'burst', { sizeMultiplier: 2, velocityMultiplier: 1.2 });
            }
            h.hp = 0;
        }
    }

    if (h && h.hp <= 0 && !h.dead && s?.state !== 'dying') {
        h.dead = true;
        if(s) {
            s.state = 'dying';
            if(p) { // projectiles disappear instantly
                s.timers.dead = 0;
            } else {
                s.timers.dead = e === w.playerId ? 2.0 : 0.5; // Player has 2s death sequence
            }
        }
        if(t && e === w.playerId) {
            t.vel.x = 0;
            t.vel.y = -12 * 60; // Death hop
        }
    }

    if (s) {
        s.animTime += w.dt;
        if (s.invulnFrames > 0) s.invulnFrames -= w.dt;
        if (s.respawnFrames > 0) s.respawnFrames -= w.dt;

        Object.keys(s.timers).forEach(timer => {
            if (s.timers[timer] > 0) {
                s.timers[timer] -= w.dt;
            } else {
                if (timer === 'stun' && s.state === 'stunned') {
                    s.state = 'patrol';
                }
                if (timer === 'victory' && s.state === 'victory') {
                    w.status = 'levelComplete';
                    w.actions.onStateUpdate({ 
                        status: 'levelComplete',
                        levelStats: {
                            timeTaken: w.time,
                            enemiesDefeated: w.enemiesDefeated,
                            gemsCollected: w.gemsCollected,
                            totalGems: w.level.collectibles.length
                        }
                    });
                }
                 if (timer === 'dead' && e === w.playerId) {
                    w.actions.onStateUpdate({ status: 'gameOver' });
                    w.status = 'gameOver'; // Ensure world status is also updated
                }
                if (timer === 'dead' && h?.dead) {
                    // Mark entity for removal if we had a removal system
                    // For now, they just stay 'dead'
                }
                // Clean up timers
                delete s.timers[timer];
            }
        });
    }

    if (a && t) {
        if (t.onGround) {
            const k = get<Kinematics>(w, 'kinematics', e);
            if (k) a.context.coyote = k.coyoteFrames / 60.0;
        } else {
            if (a.context.coyote > 0) a.context.coyote -= w.dt;
        }
        if(a.context.dropThrough > 0) a.context.dropThrough -= w.dt;
        if(a.context.dashCooldown > 0) a.context.dashCooldown -= w.dt;
    }
}

function respawn(w: World, e: EntityId) {
    const t = get<Transform>(w, 'transform', e);
    const h = get<Health>(w, 'health', e);
    const s = get<StateMachine>(w, 'state', e);
    const a = get<Abilities>(w, 'abilities', e);
    const k = get<Kinematics>(w, 'kinematics', e);

    if (t && h && s && a && k) {
        t.pos = { ...t.lastCheckpoint };
        t.vel = { x: 0, y: 0 };
        h.hp = h.maxHp;
        h.dead = false;
        s.state = 'idle';
        s.invulnFrames = 3.0; // 3 seconds invulnerability on respawn
        delete s.timers.dead;
        a.context.jumpsLeft = k.maxJumps;
        a.context.hasDiaper = true;

        // Respawn visual effect
        const centerX = t.pos.x + t.size.x / 2;
        const centerY = t.pos.y + t.size.y / 2;
        w.actions.createParticleBurst(centerX, centerY, 60, '#FFD700', 'fountain', { sizeMultiplier: 2, velocityMultiplier: 1.5 });
        w.actions.createParticleBurst(centerX, centerY, 30, '#FFFFFF', 'fountain', { sizeMultiplier: 1.5, velocityMultiplier: 1.2 });
        w.actions.setScreenShake(8, 15);
    }
}

export const statusSystem = {
    update: (w: World) => w.entities.forEach(e => updateEntityStatus(w, e)),
    respawn,
};