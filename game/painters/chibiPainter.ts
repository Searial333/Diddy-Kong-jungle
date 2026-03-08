
import type { World } from '../../types';
import { get } from '../ecs';
import type { Palette, StateMachine, Transform, Abilities } from '../components';

const p = 4; // pixel size

const drawPart = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x * p), Math.floor(y * p), w * p, h * p);
};

const drawHead = (ctx: CanvasRenderingContext2D, pal: Palette, yOff: number = 0, gender: 'male' | 'female' = 'male') => {
    // Base Head
    drawPart(ctx, 5, 2 + yOff, 8, 8, pal.skin_shadow);
    drawPart(ctx, 5, 1 + yOff, 8, 7, pal.skin);

    // Eyes
    drawPart(ctx, 7, 5 + yOff, 1, 1, pal.eyes);
    drawPart(ctx, 10, 5 + yOff, 1, 1, pal.eyes);

    // Hair
    if (gender === 'male') {
        drawPart(ctx, 5, 1 + yOff, 8, 3, pal.hair);
        drawPart(ctx, 4, 2 + yOff, 1, 2, pal.hair);
        drawPart(ctx, 13, 2 + yOff, 1, 2, pal.hair);
    } else {
        // Female hair
        drawPart(ctx, 5, 0 + yOff, 8, 4, pal.hair); // Top
        drawPart(ctx, 4, 1 + yOff, 1, 5, pal.hair); // Left side
        drawPart(ctx, 13, 1 + yOff, 1, 5, pal.hair); // Right side
        drawPart(ctx, 5, 8 + yOff, 2, 2, pal.hair); // Left long part
        drawPart(ctx, 11, 8 + yOff, 2, 2, pal.hair); // Right long part
    }
};

const drawQuarterTurnHead = (ctx: CanvasRenderingContext2D, pal: Palette, yOff: number = 0, gender: 'male' | 'female' = 'male') => {
    // Base Head
    drawPart(ctx, 4, 2 + yOff, 8, 8, pal.skin_shadow);
    drawPart(ctx, 4, 1 + yOff, 8, 7, pal.skin);

    // Eyes
    drawPart(ctx, 9, 5 + yOff, 1, 1, pal.eyes);
    
    // Hair
    if (gender === 'male') {
        drawPart(ctx, 4, 1 + yOff, 8, 3, pal.hair);
        drawPart(ctx, 3, 2 + yOff, 1, 2, pal.hair);
        drawPart(ctx, 12, 2 + yOff, 1, 2, pal.hair);
    } else {
        // Female hair
        drawPart(ctx, 4, 0 + yOff, 8, 4, pal.hair); // Top
        drawPart(ctx, 3, 1 + yOff, 1, 5, pal.hair); // Left side
        drawPart(ctx, 12, 1 + yOff, 1, 5, pal.hair); // Right side
        drawPart(ctx, 4, 8 + yOff, 2, 2, pal.hair); // Left long part
        drawPart(ctx, 10, 8 + yOff, 2, 2, pal.hair); // Right long part
    }
};


const drawTorso = (ctx: CanvasRenderingContext2D, pal: Palette, y: number, gender: 'male' | 'female' = 'male') => {
    if (gender === 'male') {
        drawPart(ctx, 5, y, 8, 6, pal.skin_shadow);
        drawPart(ctx, 5, y, 8, 5, pal.skin);
    } else {
        drawPart(ctx, 6, y, 6, 6, pal.skin_shadow);
        drawPart(ctx, 6, y, 6, 5, pal.skin);
        drawPart(ctx, 5, y + 1, 8, 3, pal.skin);
    }
};

const drawPelvis = (ctx: CanvasRenderingContext2D, pal: Palette, y: number) => {
    drawPart(ctx, 6, y, 6, 3, pal.skin_shadow);
    drawPart(ctx, 6, y, 6, 2, pal.skin);
};

const drawLeg = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, h: number) => {
    drawPart(ctx, x, y, 3, h, pal.skin_shadow);
    drawPart(ctx, x, y, 3, h-1, pal.skin);
};

const drawArm = (ctx: CanvasRenderingContext2D, pal: Palette, x: number, y: number, h: number) => {
    drawPart(ctx, x, y, 2, h, pal.skin_shadow);
    drawPart(ctx, x, y, 2, h-1, pal.skin);
};


const drawIdle = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, gender: 'male' | 'female') => {
    const breathFrame = Math.floor(s.animTime * 2) % 4;
    const bob = [0, 1, 0, 0][breathFrame];
    const bodyY = 9 + bob;

    // Order: back arm, legs, pelvis, torso, head, front arm
    drawArm(ctx, pal, 3, bodyY, 5); // back arm
    drawLeg(ctx, pal, 6, bodyY + 7, 5); // back leg
    drawLeg(ctx, pal, 9, bodyY + 7, 5); // front leg
    drawPelvis(ctx, pal, bodyY + 5);
    drawTorso(ctx, pal, bodyY, gender);
    drawHead(ctx, pal, bob, gender);
    drawArm(ctx, pal, 13, bodyY, 5); // front arm
};

const drawRun = (ctx: CanvasRenderingContext2D, s: StateMachine, pal: Palette, gender: 'male' | 'female') => {
    const f = Math.floor(s.animTime * 10) % 6;
    const bob = [0, -1, -1, 0, 1, 1][f];
    const bodyY = 9 + bob;

    // Legs
    const legPos = [
        [6, bodyY+7, 5,  10, bodyY+8, 4], // Back, Front
        [6, bodyY+8, 4,  10, bodyY+7, 5],
        [7, bodyY+9, 3,  9, bodyY+7, 5],
        [10, bodyY+7, 5, 6, bodyY+8, 4],
        [10, bodyY+8, 4, 6, bodyY+7, 5],
        [9, bodyY+9, 3,  7, bodyY+7, 5],
    ][f];
    // Arms
    const armPos = [
        [13, bodyY, 5], // Front
        [13, bodyY+1, 5],
        [14, bodyY+2, 5],
        [3, bodyY, 5], // Front (is back now)
        [3, bodyY+1, 5],
        [2, bodyY+2, 5],
    ][f];
    const backArmPos = [
        [3, bodyY, 5],
        [2, bodyY+1, 5],
        [3, bodyY+2, 5],
        [13, bodyY, 5],
        [14, bodyY+1, 5],
        [13, bodyY+2, 5],
    ][f];
    
    // Order: back arm, legs, pelvis, torso, head, front arm
    drawArm(ctx, pal, backArmPos[0], backArmPos[1], backArmPos[2]);
    drawLeg(ctx, pal, legPos[0], legPos[1], legPos[2]); // back leg
    drawLeg(ctx, pal, legPos[3], legPos[4], legPos[5]); // front leg
    drawPelvis(ctx, pal, bodyY + 5);
    drawTorso(ctx, pal, bodyY, gender);
    drawQuarterTurnHead(ctx, pal, bob, gender);
    drawArm(ctx, pal, armPos[0], armPos[1], armPos[2]);
};

const drawForwardJump = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, gender: 'male' | 'female') => {
    const isFalling = t.vel.y > 2;
    const bodyY = 9;
    const legH = isFalling ? 3 : 4;
    
    // Order: back arm, legs, pelvis, torso, head, front arm
    drawArm(ctx, pal, 3, bodyY + 4, 4); // back arm
    drawLeg(ctx, pal, 6, bodyY + 7, legH); // back leg
    drawLeg(ctx, pal, 9, bodyY + 7, legH); // front leg
    drawPelvis(ctx, pal, bodyY + 5);
    drawTorso(ctx, pal, bodyY, gender);
    drawHead(ctx, pal, 0, gender);
    drawArm(ctx, pal, 13, bodyY + 4, 4); // front arm
};

const drawSideJump = (ctx: CanvasRenderingContext2D, t: Transform, pal: Palette, gender: 'male' | 'female') => {
    const isFalling = t.vel.y > 2;
    const bodyY = 9;
    const legH = isFalling ? 3 : 4;
    
    // Order: back arm, legs, pelvis, torso, head, front arm
    drawArm(ctx, pal, 2, bodyY + 4, 4); // back arm
    drawLeg(ctx, pal, 5, bodyY + 7, legH); // back leg (tucked behind)
    drawLeg(ctx, pal, 9, bodyY + 7, legH); // front leg
    drawPelvis(ctx, pal, bodyY + 5);
    drawTorso(ctx, pal, bodyY, gender);
    drawQuarterTurnHead(ctx, pal, 0, gender);
    drawArm(ctx, pal, 12, bodyY + 4, 4); // front arm
};

const drawBackflip = (ctx: CanvasRenderingContext2D, t: Transform, s: StateMachine, pal: Palette, gender: 'male' | 'female') => {
    // 0.5s animation duration approx, rotate continuously
    const rotation = s.animTime * 15; 

    ctx.save();
    ctx.translate(t.size.x / 2, t.size.y / 2);
    ctx.rotate(-rotation);
    ctx.translate(-t.size.x / 2, -t.size.y / 2);

    drawForwardJump(ctx, t, pal, gender);

    ctx.restore();
};

function chibiPainter(ctx: CanvasRenderingContext2D, w: World, e: number, gender: 'male' | 'female') {
    const t = get<Transform>(w, 'transform', e);
    const s = get<StateMachine>(w, 'state', e);
    const pal = get<Palette>(w, 'palette', e);
    if (!t || !s || !pal) return;

    ctx.save();
    if (s.state !== 'dying') {
        ctx.scale(t.facing, 1);
        ctx.translate(t.facing === -1 ? -t.size.x : 0, 0);
    }

    const isMovingHorizontally = Math.abs(t.vel.x) > 10;
    
    switch (s.state) {
        case 'running':
            drawRun(ctx, s, pal, gender);
            break;
        case 'jumping':
        case 'falling':
        case 'wallSliding':
             if (isMovingHorizontally) {
                drawSideJump(ctx, t, pal, gender);
            } else {
                drawForwardJump(ctx, t, pal, gender);
            }
            break;
        case 'backflip':
        case 'rolling':
            drawBackflip(ctx, t, s, pal, gender);
            break;
        case 'dashing':
            if (isMovingHorizontally) {
                drawSideJump(ctx, t, pal, gender);
            } else {
                drawForwardJump(ctx, t, pal, gender);
            }
            break;
        default:
            drawIdle(ctx, s, pal, gender);
            break;
    }

    ctx.restore();
}

export function chibiMalePainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    chibiPainter(ctx, w, e, 'male');
}

export function chibiFemalePainter(ctx: CanvasRenderingContext2D, w: World, e: number) {
    chibiPainter(ctx, w, e, 'female');
}
