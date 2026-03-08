import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Abilities, Health, StateMachine, Transform } from '../components';
import { activeCollectibles } from './entitySystem';

const PERCEPTION_RADIUS_SQ = 400 * 400; // Squared for performance

export function targetSystem(w: World) {
    const playerT = get<Transform>(w, 'transform', w.playerId);
    const playerA = get<Abilities>(w, 'abilities', w.playerId);

    if (!playerT || !playerA) {
        if(playerA) playerA.context.lookTarget = null;
        return;
    }

    let closestTarget: Vec2 | null = null;
    let minDistSq = PERCEPTION_RADIUS_SQ;
    const playerCenter = { x: playerT.pos.x + playerT.size.x / 2, y: playerT.pos.y + playerT.size.y / 2 };

    // Find closest enemy
    w.entities.forEach(e => {
        if (e === w.playerId) return;
        const s = get<StateMachine>(w, 'state', e);
        if (s && s.enemyId) { // It's an enemy
            const t = get<Transform>(w, 'transform', e);
            const h = get<Health>(w, 'health', e);
            if (t && h && !h.dead) {
                const enemyCenter = { x: t.pos.x + t.size.x / 2, y: t.pos.y + t.size.y / 2 };
                const dx = enemyCenter.x - playerCenter.x;
                const dy = enemyCenter.y - playerCenter.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDistSq) {
                    minDistSq = distSq;
                    closestTarget = enemyCenter;
                }
            }
        }
    });

    // Find closest collectible
    const collectibleMap = new Map(w.level.collectibles.map(c => [c.id, c]));
    activeCollectibles.forEach(collectibleId => {
        const c = collectibleMap.get(collectibleId);
        if (c) {
            const collectibleCenter = { x: c.x + 12, y: c.y + 12 }; // Gem size is 24x24
            const dx = collectibleCenter.x - playerCenter.x;
            const dy = collectibleCenter.y - playerCenter.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestTarget = collectibleCenter;
            }
        }
    });

    // Check for Level End
    if (playerT) {
        const playerRect = {
            l: playerT.pos.x,
            r: playerT.pos.x + playerT.size.x,
            t: playerT.pos.y,
            b: playerT.pos.y + playerT.size.y
        };

        const reachedGoal = w.level.zones.some(z => {
            if (z.type !== 'goal') return false;
            // AABB Collision
            return (
                playerRect.l < z.x + z.w &&
                playerRect.r > z.x &&
                playerRect.t < z.y + z.h &&
                playerRect.b > z.y
            );
        });

        if (reachedGoal) {
             // Trigger Victory
             const s = get<StateMachine>(w, 'state', w.playerId);
             if (s && s.state !== 'victory' && w.status === 'playing') {
                 s.state = 'victory';
                 s.animTime = 0;
                 s.timers.victory = 3.0; // Dance for 3 seconds
                 w.status = 'victory_dance';
                 w.actions.onStateUpdate({ status: 'victory_dance' });
             }
        }
    }

    playerA.context.lookTarget = closestTarget;
}