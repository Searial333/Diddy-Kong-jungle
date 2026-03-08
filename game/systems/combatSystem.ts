
import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, StateMachine, Health, Kinematics, Projectile } from '../components';

function aabb(r1: any, r2: any) {
  return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

export function combatSystem(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerS = get<StateMachine>(w, 'state', w.playerId);
    const playerH = get<Health>(w, 'health', w.playerId);
    const playerK = get<Kinematics>(w, 'kinematics', w.playerId);
    if (!playerT || !playerS || !playerH || !playerK) return;

    const enemies: number[] = [];
    w.entities.forEach(e => {
        if (get<StateMachine>(w, 'state', e)?.enemyId) {
            enemies.push(e);
        }
    });

    // --- Player attacks affecting enemies ---

    // 1. Milk Laser Beam
    if (playerS.state === 'bottleShootBeam') {
        const beamWidth = 1200;
        const beamHeight = 40;
        const beamOriginY = playerT.pos.y + 68;
        const beamY = beamOriginY - beamHeight / 2;
        const beamX = playerT.facing > 0 ? playerT.pos.x + playerT.size.x + 28 : playerT.pos.x - 28 - beamWidth;
        const beamRect = { x: beamX, y: beamY, w: beamWidth, h: beamHeight };

        enemies.forEach(e => {
            const enemyH = get<Health>(w, 'health', e);
            const enemyS = get<StateMachine>(w, 'state', e);
            const enemyT = get<Transform>(w, 'transform', e);
            if (!enemyH || !enemyS || !enemyT || enemyH.dead) return;

            const enemyRect = { x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y };
            if (aabb(enemyRect, beamRect) && enemyS.invulnFrames <= 0) {
                 enemyH.hp -= 1;
                 enemyS.invulnFrames = 0.2; // Can be hit multiple times by beam
                 w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#ffdd55', vy: -60 });
                 if(enemyH.hp <= 0) {
                    enemyS.state = 'dying';
                    w.enemiesDefeated++;
                }
            }
        });
    }

    // 2. Stink Cloud Damage
    w.stinkClouds.forEach(cloud => {
        const currentRadius = cloud.radius * (1 - (cloud.life / cloud.maxLife)**2);
        enemies.forEach(e => {
            const enemyH = get<Health>(w, 'health', e);
            const enemyS = get<StateMachine>(w, 'state', e);
            const enemyT = get<Transform>(w, 'transform', e);
            if (!enemyH || !enemyS || !enemyT || enemyH.dead) return;

            const dist = Math.hypot((enemyT.pos.x + enemyT.size.x / 2) - cloud.x, (enemyT.pos.y + enemyT.size.y / 2) - cloud.y);
            if (dist < currentRadius && enemyS.invulnFrames <= 0) {
                 enemyH.hp -= 1;
                 enemyS.invulnFrames = 0.5; // Damage over time
                 w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#8BC34A', vy: -60 });
                 if(enemyH.hp <= 0) {
                    enemyS.state = 'dying';
                    w.enemiesDefeated++;
                }
            }
        });
    });

    // --- Enemy attacks affecting player and projectile collisions ---
    w.entities.forEach(e => {
        const enemyS = get<StateMachine>(w, 'state', e);
        // It's an enemy
        if (e !== w.playerId && enemyS?.enemyId) {
            const enemyT = get<Transform>(w, 'transform', e);
            const enemyH = get<Health>(w, 'health', e);
            if (!enemyT || !enemyH || enemyH.dead) return;

            const playerRect = { x: playerT.pos.x, y: playerT.pos.y, w: playerT.size.x, h: playerT.size.y };
            const enemyRect = { x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y };
            
            if (aabb(playerRect, enemyRect)) {
                const playerIsAttacking = playerS.state === 'rolling' || playerS.state === 'dashing' || playerS.state === 'slamming';
                const playerIsStomping = playerT.vel.y > 0 && playerRect.y + playerRect.h < enemyRect.y + enemyRect.h / 2;

                if (enemyS.invulnFrames <= 0 && (playerIsAttacking || playerIsStomping)) {
                    enemyH.hp -= 1;
                    enemyS.invulnFrames = 0.5;
                    w.floatingTexts.push({ text: '1', x: enemyT.pos.x + enemyT.size.x / 2, y: enemyT.pos.y, life: 1, maxLife: 1, color: '#ffdd55', vy: -60 });
                    w.actions.createParticleBurst(enemyT.pos.x + enemyT.size.x / 2, enemyT.pos.y + enemyT.size.y / 2, 10, '#ff9933', 'burst');
                    if (playerIsStomping) {
                        playerT.vel.y = -playerK.jumpForce * 0.7;
                        playerS.state = 'jumping';
                    }
                    if(enemyH.hp <= 0) {
                        enemyS.state = 'dying';
                        w.enemiesDefeated++;
                    } else {
                        enemyS.state = 'stunned';
                        enemyS.timers.stun = 1.0;
                    }
                } else if (playerS.invulnFrames <= 0) {
                    playerH.hp -= 1;
                    playerS.invulnFrames = 2.0; // Invulnerability time
                    
                    // HURT STATE TRIGGER
                    playerS.state = 'hurt';
                    playerS.timers.hurt = 0.5; // Stun duration

                    const knockbackDir = Math.sign(playerT.pos.x - enemyT.pos.x) || 1;
                    playerT.vel.x = 350 * knockbackDir;
                    playerT.vel.y = -450;
                    
                    w.actions.playSound('hurt'); // Assuming sound exists, otherwise ignored
                    w.actions.setScreenShake(8, 8);
                    w.actions.createParticleBurst(playerT.pos.x + playerT.size.x / 2, playerT.pos.y + playerT.size.y / 2, 15, '#ff5555', 'burst');
                }
            }
        }

        // It's a projectile
        const proj = get<Projectile>(w, 'projectile', e);
        if (proj && proj.life > 0) {
             const projT = get<Transform>(w, 'transform', e);
             if(!projT) return;
             const projRect = {x: projT.pos.x, y: projT.pos.y, w: projT.size.x, h: projT.size.y };

             enemies.forEach(enemyId => {
                 const enemyT = get<Transform>(w, 'transform', enemyId);
                 const enemyH = get<Health>(w, 'health', enemyId);
                 if (!enemyT || !enemyH || enemyH.dead) return;
                 const enemyRect = {x: enemyT.pos.x, y: enemyT.pos.y, w: enemyT.size.x, h: enemyT.size.y};

                 if (aabb(projRect, enemyRect)) {
                     proj.life = 0; // Mark for deletion
                     enemyH.hp -= proj.damage;
                     
                     const cx = projT.pos.x + projT.size.x/2;
                     const cy = projT.pos.y + projT.size.y/2;

                     // Enhanced impact feedback
                     if (proj.type === 'peanut') {
                         w.actions.createParticleBurst(cx, cy, 8, '#D7CCC8', 'burst', { sizeMultiplier: 0.8 });
                         w.actions.createParticleBurst(cx, cy, 4, '#5D4037', 'burst', { sizeMultiplier: 0.6 });
                     } else if (proj.type === 'milk') {
                         w.actions.createParticleBurst(cx, cy, 8, '#E1F5FE', 'burst');
                     } else {
                         w.actions.createParticleBurst(cx, cy, 10, '#FFFFFF');
                     }

                     if(enemyH.hp <= 0) {
                         enemyS.state = 'dying';
                         w.enemiesDefeated++;
                     }
                 }
             });
        }
    });
}
