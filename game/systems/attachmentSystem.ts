
import type { World, EntityId } from '../../types';
import { get } from '../ecs';
import type { Attachments, Transform, Kinematics, StateMachine, Health } from '../components';
import { PLATFORM } from '../../constants/ids';

interface ChainPoint {
  x: number; y: number; oldX: number; oldY: number;
}
type ChainState = { points: ChainPoint[] };
const chainMemory = new Map<EntityId, Map<string, ChainState>>();

function distSq(x1: number, y1: number, x2: number, y2: number) {
    return (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1);
}

export function clearAttachments(e: EntityId) {
    chainMemory.delete(e);
}

export function attachmentSystem(w: World) {
    for (const e of w.entities) {
        const att = get<Attachments>(w, 'attachments', e);
        const t = get<Transform>(w, 'transform', e);
        const k = get<Kinematics>(w, 'kinematics', e);
        const s = get<StateMachine>(w, 'state', e);

        if (!att || !t || !k) continue;

        if (!chainMemory.has(e)) chainMemory.set(e, new Map());
        const mem = chainMemory.get(e)!;

        for (const a of att.list) {
            if (a.type !== 'chain') continue;

            if (!mem.has(a.id)) {
                const points = Array.from({ length: a.segments }, () => ({
                    x: t.pos.x, y: t.pos.y, oldX: t.pos.x, oldY: t.pos.y
                }));
                mem.set(a.id, { points });
            }

            const chain = mem.get(a.id)!;
            const gravity = k.gravity;

            let anchorX: number, anchorY: number;

            // Fix rotation pivot for rolling
            if (s && s.state === 'rolling') {
                const p = 4; 
                const rotation = s.animTime * 25;
                const rotCenterX = t.pos.x + t.size.x / 2;
                const rotCenterY = t.pos.y + t.size.y / 2 + 4 * p;
                
                const unrotatedAnchorX = t.pos.x + (t.facing > 0 ? a.anchor.x : t.size.x - a.anchor.x);
                const unrotatedAnchorY = t.pos.y + a.anchor.y;
                
                const relX = unrotatedAnchorX - rotCenterX;
                const relY = unrotatedAnchorY - rotCenterY;
                
                const cosA = Math.cos(rotation);
                const sinA = Math.sin(rotation);

                const rotatedX = relX * cosA - relY * sinA;
                const rotatedY = relX * sinA + relY * cosA;

                anchorX = rotatedX + rotCenterX;
                anchorY = rotatedY + rotCenterY;

            } else {
                anchorX = t.pos.x + (t.facing > 0 ? a.anchor.x : t.size.x - a.anchor.x);
                anchorY = t.pos.y + a.anchor.y;
            }

            // Physics Pass
            chain.points.forEach((p, index) => {
                const vx = (p.x - p.oldX) * 0.99;
                const vy = (p.y - p.oldY) * 0.99;
                p.oldX = p.x;
                p.oldY = p.y;
                p.x += vx;
                p.y += vy;
                p.y += gravity * w.dt * w.dt;
                
                // Tension Logic (Muscle Tone)
                if (a.tension && index < chain.points.length * 0.9) {
                    const stiffness = Math.pow(1.0 - (index / chain.points.length), 2);
                    const liftForce = 3500 * a.tension * stiffness * w.dt * w.dt;
                    p.x -= t.facing * liftForce;
                    p.y -= liftForce * 0.8;
                }
            });

            // Constraint Pass
            const iterations = a.tension ? 10 : 5;
            for (let i = 0; i < iterations; i++) {
                chain.points[0].x = anchorX;
                chain.points[0].y = anchorY;

                for (let j = 1; j < chain.points.length; j++) {
                    const p1 = chain.points[j - 1];
                    const p2 = chain.points[j];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const distance = Math.hypot(dx, dy) || 0.001;
                    const difference = a.segmentLength - distance;
                    const percent = difference / distance / 2;
                    const offsetX = dx * percent;
                    const offsetY = dy * percent;

                    p1.x -= offsetX;
                    p1.y -= offsetY;
                    p2.x += offsetX;
                    p2.y += offsetY;
                }
            }

            // Damage Collision Pass
            if (a.damage && a.damage > 0 && w.level && w.level.platforms) {
                 const tailRadius = (a.width || 8) / 2;
                 const tailRadiusSq = tailRadius * tailRadius;

                 // 1. Entity Collision (Enemies)
                 w.entities.forEach(targetId => {
                    if (targetId === e) return;
                    
                    const tS = get<StateMachine>(w, 'state', targetId);
                    if (tS && tS.enemyId && tS.invulnFrames <= 0) {
                        const tT = get<Transform>(w, 'transform', targetId);
                        const tH = get<Health>(w, 'health', targetId);
                        
                        if (tT && tH && !tH.dead) {
                             const enemyCenterX = tT.pos.x + tT.size.x / 2;
                             const enemyCenterY = tT.pos.y + tT.size.y / 2;
                             const hitRadius = (tT.size.x/2 + tailRadius + 4);
                             const hitDistSq = hitRadius * hitRadius;

                             let hit = false;
                             for (const p of chain.points) {
                                 if (distSq(p.x, p.y, enemyCenterX, enemyCenterY) < hitDistSq) {
                                     hit = true;
                                     break;
                                 }
                             }

                             if (hit) {
                                 tH.hp -= a.damage!;
                                 tS.invulnFrames = 0.5;
                                 w.actions.playSound('enemyHit');
                                 w.actions.createParticleBurst(enemyCenterX, enemyCenterY, 8, '#FFD700', 'burst');
                                 w.floatingTexts.push({ text: `${a.damage}`, x: enemyCenterX, y: tT.pos.y, life: 0.8, maxLife: 0.8, color: '#FFFFFF', vy: -40 });
                                 
                                 tT.vel.x = (tT.pos.x - t.pos.x > 0 ? 1 : -1) * 200;
                                 tT.vel.y = -100;
                                 
                                 if (tH.hp <= 0) {
                                     tS.state = 'dying';
                                     w.actions.playSound('explode');
                                 } else {
                                     tS.state = 'stunned';
                                     tS.timers.stun = 0.5;
                                 }
                             }
                        }
                    }
                 });

                 // 2. Platform Collision
                 for (const plat of w.level.platforms) {
                     if (plat.style !== PLATFORM.BREAKABLE && plat.style !== PLATFORM.BRICK && plat.style !== PLATFORM.TURNBLOCK) continue;
                     
                     const platRect = { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
                     let hit = false;
                     
                     for (const p of chain.points) {
                         if (p.x >= platRect.x - tailRadius && p.x <= platRect.x + platRect.w + tailRadius &&
                             p.y >= platRect.y - tailRadius && p.y <= platRect.y + platRect.h + tailRadius) {
                             hit = true;
                             break;
                         }
                     }

                     if (hit) {
                         w.actions.playSound('bump');
                         w.actions.createParticleBurst(plat.x + plat.w/2, plat.y + plat.h/2, 3, '#8D6E63', 'burst');
                     }
                 }
            }
        }
    }
}

export function drawAttachments(ctx: CanvasRenderingContext2D, w: World, e: EntityId) {
    const att = get<Attachments>(w, 'attachments', e);
    if (!att) return;
    const mem = chainMemory.get(e);
    if (!mem) return;

    for (const a of att.list) {
        if (a.type !== 'chain') continue;
        const chain = mem.get(a.id);
        if (!chain) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const width = a.width || 8;

        // Outer (Color A)
        ctx.strokeStyle = a.colorA;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(chain.points[0].x, chain.points[0].y);
        for (let i = 1; i < chain.points.length; i++) {
            ctx.lineTo(chain.points[i].x, chain.points[i].y);
        }
        ctx.stroke();

        // Inner (Color B)
        ctx.strokeStyle = a.colorB;
        ctx.lineWidth = width * 0.5;
        ctx.beginPath();
        ctx.moveTo(chain.points[0].x, chain.points[0].y);
        for (let i = 1; i < chain.points.length; i++) {
            ctx.lineTo(chain.points[i].x, chain.points[i].y);
        }
        ctx.stroke();

        ctx.restore();
    }
}
