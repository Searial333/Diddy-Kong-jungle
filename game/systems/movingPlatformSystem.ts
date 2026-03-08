
import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform } from '../components';

export function movingPlatformSystem(w: World) {
    w.level.platforms.forEach(p => {
        if (p.moving) {
            p.moving.currentIndex = p.moving.currentIndex ?? 0;
            p.moving.progress = p.moving.progress ?? 0;

            const start = p.moving.path[p.moving.currentIndex];
            const end = p.moving.path[(p.moving.currentIndex + 1) % p.moving.path.length];
            
            const dist = Math.hypot(end.x - start.x, end.y - start.y);
            const travelTime = dist / p.moving.speed;
            
            p.moving.progress += w.dt / travelTime;
            
            if (p.moving.progress >= 1) {
                p.moving.progress = 0;
                p.moving.currentIndex = (p.moving.currentIndex + 1) % p.moving.path.length;
            }

            const newStart = p.moving.path[p.moving.currentIndex];
            const newEnd = p.moving.path[(p.moving.currentIndex + 1) % p.moving.path.length];

            const dx = newEnd.x - newStart.x;
            const dy = newEnd.y - newStart.y;
            
            const prevX = p.x;
            const prevY = p.y;

            p.x = newStart.x + dx * p.moving.progress;
            p.y = newStart.y + dy * p.moving.progress;
            
            const moveX = p.x - prevX;
            const moveY = p.y - prevY;

            // Move entities standing on the platform
            w.entities.forEach(e => {
                const t = get<Transform>(w, 'transform', e);
                if (t && t.onGround) {
                    const entityRect = { x: t.pos.x, y: t.pos.y, w: t.size.x, h: t.size.y };
                    const platformRect = { x: prevX, y: prevY, w: p.w, h: p.h + 5 }; // a bit of tolerance
                     if (entityRect.x < platformRect.x + platformRect.w &&
                         entityRect.x + entityRect.w > platformRect.x &&
                         Math.abs((entityRect.y + entityRect.h) - platformRect.y) < 5)
                     {
                         t.pos.x += moveX;
                         t.pos.y += moveY;
                     }
                }
            });
        }
    });
}
