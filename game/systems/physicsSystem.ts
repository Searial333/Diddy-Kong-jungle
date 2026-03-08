import type { World } from '../../types';
import { get } from '../ecs';
import type { Transform, Kinematics, Health, StateMachine } from '../components';

export function physicsSystem(w: World) {
    w.entities.forEach(e => {
        const t = get<Transform>(w, 'transform', e);
        const k = get<Kinematics>(w, 'kinematics', e);
        const s = get<StateMachine>(w, 'state', e);

        // Only skip physics for entities that are missing essential components.
        // Allow physics to run on dying entities for the death animation.
        if (!t || !k) return;

        // Apply gravity unless climbing
        if (s?.state !== 'climbing') {
            t.vel.y += k.gravity * w.dt;
        }

        // Apply velocity
        t.pos.x += t.vel.x * w.dt;
        t.pos.y += t.vel.y * w.dt;

        // Out of bounds check (simple kill plane)
        if (t.pos.y > w.level.bounds.bottom) {
            const health = get<Health>(w, 'health', e);
            if (health) {
                health.hp = 0;
            }
        }
    });
}