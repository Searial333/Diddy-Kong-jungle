
import type { World, Vec2 } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Kinematics, Abilities } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
};
const drawPixel = (ctx: CanvasRenderingContext2D, x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), p, p);
};

const getPupilOffset = (t: Transform, a: Abilities, defaultX: number = 0): { x: number; y: number } => {
    if (a.context.lookTarget) {
        const headX = t.pos.x + t.size.x / 2;
        const headY = t.pos.y + 8 * p;
        const vecX = a.context.lookTarget.x - headX;
        const vecY = a.context.lookTarget.y - headY;
        const mag = Math.hypot(vecX, vecY);
        if (mag > p * 4) {
            return { x: Math.round(vecX / mag), y: Math.round(vecY / mag) };
        }
    }
    const moveDirection = Math.abs(t.vel.x) > 5 ? Math.sign(t.vel.x) * t.facing : 0;
    return { x: defaultX || moveDirection, y: 0 };
};

const drawHead = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities, yOff: number = 0) => {
    const timeInCycle = s.animTime % 12;
    let earBob = 0;
    if (timeInCycle > 9 && timeInCycle < 10) earBob = -1;

    drawPart(ctx, 4, 3 + yOff, 12, 9, pal.body);
    drawPart(ctx, 5, 2 + yOff, 10, 11, pal.body);
    drawPart(ctx, 4, 1 + yOff + earBob, 4, 4, pal.body_light); // Left ear
    drawPart(ctx, 12, 1 + yOff, 4, 4, pal.body_light); // Right ear
    drawPart(ctx, 4, 5 + yOff, 12, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + yOff, 12, 3, pal.bandana);
    drawPart(ctx, 4, 5 + yOff, 12, 1, pal.bandana_highlight);
    drawPart(ctx, 6, 8 + yOff, 8, 4, pal.snout_dark);
    drawPart(ctx, 7, 9 + yOff, 6, 3, pal.snout);
    drawPart(ctx, 9, 10 + yOff, 2, 1, pal.nose);
    
    let lookDirection: 'forward' | 'away' | 'turning' = 'forward';
    if (timeInCycle > 8 && timeInCycle < 9) lookDirection = 'turning';
    else if (timeInCycle >= 9 && timeInCycle < 11) lookDirection = 'away';
    else if (timeInCycle >= 11) lookDirection = 'turning';

    const pupilOffset = getPupilOffset(t, a);
    if (a.context.lookTarget) lookDirection = 'forward';
    
    const eyeX1 = lookDirection === 'forward' ? 7 : lookDirection === 'turning' ? 7.5 : 8;
    const eyeX2 = lookDirection === 'forward' ? 12 : lookDirection === 'turning' ? 11.5 : 11;

    drawPart(ctx, 6, 8 + yOff, 3, 1, 'white');
    drawPart(ctx, 11, 8 + yOff, 3, 1, 'white');
    
    drawPixel(ctx, eyeX1 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
    drawPixel(ctx, eyeX2 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
}

const drawQuarterTurnHead = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, a: Abilities, yOff: number = 0) => {
    drawPart(ctx, 4, 3 + yOff, 11, 9, pal.body);
    drawPart(ctx, 5, 2 + yOff, 9, 11, pal.body);
    drawPart(ctx, 4, 1 + yOff, 4, 4, pal.body_light);
    drawPart(ctx, 11, 2 + yOff, 3, 3, pal.body_light);
    drawPart(ctx, 4, 5 + yOff, 11, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + yOff, 11, 3, pal.bandana);
    drawPart(ctx, 4, 5 + yOff, 11, 1, pal.bandana_highlight);
    drawPart(ctx, 9, 8 + yOff, 6, 4, pal.snout_dark);
    drawPart(ctx, 10, 9 + yOff, 5, 3, pal.snout);
    drawPart(ctx, 12, 10 + yOff, 2, 1, pal.nose);
    drawPart(ctx, 7, 8 + yOff, 3, 1, 'white');
    drawPart(ctx, 11, 8 + yOff, 2, 1, 'white');
    const pupilOffset = getPupilOffset(t, a, 1);
    drawPixel(ctx, 8 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
    drawPixel(ctx, 11 + pupilOffset.x, 8 + yOff + pupilOffset.y, pal.eye);
};

const drawDiaper = (ctx: CanvasRenderingContext2D, bodyY: number, xOffset: number = 0) => {
    const y = bodyY + 7;
    const x = xOffset + 1;
    drawPart(ctx, 4 + x, y, 10, 5, '#D8CFC2');
    drawPart(ctx, 4 + x, y, 10, 4, '#F5EFE6');
    drawPart(ctx, 6 + x, y + 1, 6, 2, '#FFFFFF');
    drawPart(ctx, 5 + x, y, 8, 2, '#F5EFE6');
    drawPart(ctx, 5 + x, y, 8, 1, '#D8CFC2');
    drawPart(ctx, 4 + x, y + 1, 1, 2, '#E6A200');
    drawPart(ctx, 13 + x, y + 1, 1, 2, '#E6A200');
};

const drawIdleSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const breathFrame = Math.floor(s.animTime * 4) % 12;
    const bob = [0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0][breathFrame];
    const bodyY = 11 + bob;
    drawPart(ctx, 2, bodyY + 1, 3, 7, pal.body_shadow);
    drawPart(ctx, 5, 20 + bob, 4, 4, pal.body);
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    drawPart(ctx, 5, bodyY + 1, 10, 8, pal.vest);
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);
    drawPart(ctx, 11, 20 + bob, 4, 4, pal.body);
    drawHead(ctx, t, s, pal, a, bob);
    drawPart(ctx, 15, bodyY + 1, 3, 7, pal.body);
};

const drawRunSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities) => {
    const f = Math.floor(s.animTime * 16) % 12;
    const bodyY = [2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2][f] + 10;
    const legY = 10 + bodyY;
    drawPart(ctx, 4, 1 + bodyY, 11, 10, pal.body_shadow);
    drawPart(ctx, 4, 1 + bodyY, 11, 9, pal.body);
    drawPart(ctx, 5, 2 + bodyY, 9, 8, pal.vest);
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY, (bodyY-11)/2);
    drawQuarterTurnHead(ctx, t, pal, a, bodyY - 10);
};

const drawAirSprite = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, a: Abilities, isMoving: boolean) => {
    const f = Math.floor(s.animTime * 8) % 4;
    const bodyY = 11 + (t.vel.y > 100 ? [1, 2, 1, 0][f] : [0, -1, 0, 1][f]);
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    drawPart(ctx, 5, bodyY+1, 10, 8, pal.vest);
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);
    if (isMoving) drawQuarterTurnHead(ctx, t, pal, a, bodyY - 11);
    else drawHead(ctx, t, s, pal, a, bodyY - 11);
};

const drawHurt = (ctx: CanvasRenderingContext2D, pal: Palette, a: Abilities) => {
    // Arms up in shock
    drawPart(ctx, 2, 8, 3, 8, pal.body); // Arm L
    drawPart(ctx, 15, 8, 3, 8, pal.body); // Arm R
    
    // Body slightly bunched
    const bodyY = 12;
    drawPart(ctx, 4, bodyY, 12, 10, pal.body_shadow);
    drawPart(ctx, 4, bodyY, 12, 9, pal.body);
    drawPart(ctx, 5, bodyY+1, 10, 8, pal.vest);
    if (a.context.hasDiaper) drawDiaper(ctx, bodyY);
    
    // Legs dangling
    drawPart(ctx, 5, 22, 4, 5, pal.body);
    drawPart(ctx, 11, 22, 4, 5, pal.body);
    
    // Head - Surprised
    const headY = 1;
    drawPart(ctx, 4, 3 + headY, 12, 9, pal.body);
    drawPart(ctx, 5, 2 + headY, 10, 11, pal.body);
    drawPart(ctx, 4, 1 + headY, 4, 4, pal.body_light);
    drawPart(ctx, 12, 1 + headY, 4, 4, pal.body_light);
    drawPart(ctx, 4, 5 + headY, 12, 4, pal.bandana_dark);
    drawPart(ctx, 4, 6 + headY, 12, 3, pal.bandana);
    
    // Eyes wide / Ouch expression
    drawPart(ctx, 7, 8 + headY, 2, 2, 'white');
    drawPart(ctx, 11, 8 + headY, 2, 2, 'white');
    drawPixel(ctx, 7, 8 + headY, pal.eye);
    drawPixel(ctx, 11, 8 + headY, pal.eye);
    
    // Mouth
    drawPart(ctx, 9, 11 + headY, 2, 2, 'black');
}

export function pixelTeddyPainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    const a = get<Abilities>(w, 'abilities', e);

    if (!t || !s || !pal || !a) return;

    if (s.state === 'in_barrel') return;

    ctx.save();
    
    // Don't flip for dying animation, rotation handles it
    if (s.state !== 'dying') {
      ctx.scale(t.facing, 1);
      ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    const isMoving = Math.abs(t.vel.x) > 10;

    switch(s.state) {
        case 'running': drawRunSprite(ctx, t, s, pal, a); break;
        case 'jumping':
        case 'falling':
        case 'wallSliding':
             drawAirSprite(ctx, t, s, pal, a, isMoving); 
             break;
        case 'rollWindup':
             drawRunSprite(ctx, t, s, pal, a); // Anticipation pose
             break;
        case 'rolling':
        case 'backflip':
             // Spin effect
             const spinSpeed = s.state === 'rolling' ? 20 : 15;
             ctx.save();
             ctx.translate(t.size.x/2, t.size.y/2);
             ctx.rotate(s.animTime * spinSpeed);
             ctx.translate(-t.size.x/2, -t.size.y/2);
             drawAirSprite(ctx, t, s, pal, a, true);
             ctx.restore();
             break;
        case 'dashing':
             ctx.save();
             // Skew for speed
             ctx.transform(1, 0, -0.4, 1, 10, 0);
             drawRunSprite(ctx, t, s, pal, a);
             ctx.restore();
             break;
        case 'hurt':
            drawHurt(ctx, pal, a);
            break;
        case 'dying':
             // Spinning chaos
             const cx = t.size.x/2;
             const cy = t.size.y/2;
             ctx.save();
             ctx.translate(cx, cy);
             ctx.rotate(s.animTime * 20); // Fast spin
             ctx.translate(-cx, -cy);
             drawHurt(ctx, pal, a);
             ctx.restore();
             break;
        default: drawIdleSprite(ctx, t, s, pal, a); break;
    }

    ctx.restore();
}

export function milkProjectilePainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    const t = get<Transform>(w, 'transform', e);
    if (!t) return;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(t.size.x / 2, t.size.y / 2, t.size.x / 2, 0, Math.PI * 2);
    ctx.fill();
}
